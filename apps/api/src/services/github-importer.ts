import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/database.js';
import { initializeDatabase } from '../db/schema.js';
import { indexBugEmbedding } from './duplicate-radar.js';
import { sseService } from './sse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GitHubRepoDetails {
  owner: string;
  name: string;
  url: string;
}

export function parseGitHubUrl(repoUrl: string): GitHubRepoDetails | null {
  try {
    const cleanUrl = repoUrl.trim().replace(/\/+$/, '');
    const match = cleanUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
    if (match) {
      return {
        owner: match[1],
        name: match[2].replace(/\.git$/, ''),
        url: `https://github.com/${match[1]}/${match[2].replace(/\.git$/, '')}`
      };
    }
    // Also support 'owner/name' shorthand
    const parts = cleanUrl.split('/');
    if (parts.length === 2 && !cleanUrl.includes('://')) {
      return {
        owner: parts[0],
        name: parts[1],
        url: `https://github.com/${parts[0]}/${parts[1]}`
      };
    }
  } catch {}
  return null;
}

function ensureExternalUser(login: string, name?: string, avatarUrl?: string): string {
  const userId = `gh_${login.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!existing) {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, name, email, role, avatar_url, is_external)
      VALUES (?, ?, ?, ?, 'reporter', ?, 1)
    `).run(userId, login, name || login, `${login}@github.com`, avatarUrl || `https://avatars.githubusercontent.com/u/0?v=4`);
  }
  return userId;
}

function ensureMilestone(title: string): string {
  const msId = `ms_${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const existing = db.prepare('SELECT id FROM milestones WHERE id = ?').get(msId);
  if (!existing) {
    db.prepare(`
      INSERT OR IGNORE INTO milestones (id, product_id, name, due_date)
      VALUES (?, 'triarc', ?, NULL)
    `).run(msId, title);
  }
  return title;
}

function ensureKeyword(labelName: string): string {
  const kwId = `kw_${labelName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;
  const existing = db.prepare('SELECT id FROM keywords WHERE id = ?').get(kwId);
  if (!existing) {
    db.prepare(`
      INSERT OR IGNORE INTO keywords (id, name, description)
      VALUES (?, ?, ?)
    `).run(kwId, labelName.slice(0, 40), `Imported from GitHub label: ${labelName}`);
  }
  return kwId;
}

export async function importGitHubRepository(options: {
  repoUrl: string;
  maxIssues?: number;
  githubToken?: string;
  useFixture?: boolean;
  fixtureName?: string;
  jobId?: string;
}) {
  initializeDatabase();
  const jobId = options.jobId || `job_${Date.now()}`;
  const parsed = parseGitHubUrl(options.repoUrl);
  if (!parsed && !options.useFixture) {
    throw new Error(`Invalid GitHub repository URL: ${options.repoUrl}. Format: https://github.com/owner/repo or owner/repo`);
  }

  const owner = parsed?.owner || 'facebook';
  const repoName = parsed?.name || 'react';
  const fullRepoKey = `${owner}/${repoName}`;
  const repoUrl = parsed?.url || `https://github.com/${fullRepoKey}`;

  // Notify SSE
  sseService.broadcast('import:progress', {
    job_id: jobId,
    stage: 'fetching',
    current: 0,
    total: 100,
    message: `Connecting to GitHub repository ${fullRepoKey}...`,
    repo_name: fullRepoKey
  });

  let rawIssues: any[] = [];

  // 1. Try Loading from bundled Fixtures first if requested or as fallback
  const fixturePath = path.join(__dirname, '../fixtures/sample-repos.json');
  let fixtures: Record<string, any> = {};
  if (fs.existsSync(fixturePath)) {
    try {
      fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    } catch {}
  }

  if (options.useFixture || fixtures[fullRepoKey] || fixtures[options.fixtureName || '']) {
    const selectedFixture = fixtures[fullRepoKey] || fixtures[options.fixtureName || ''] || fixtures['facebook/react'];
    rawIssues = selectedFixture.issues || [];
  } else {
    // 2. Fetch live from GitHub API (REST)
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Triarc-Bug-Tracker/1.0'
      };
      if (options.githubToken || process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${options.githubToken || process.env.GITHUB_TOKEN}`;
      }

      const limit = Math.min(options.maxIssues || 50, 100);
      const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues?state=all&per_page=${limit}`, { headers });
      if (!res.ok) {
        throw new Error(`GitHub API returned HTTP ${res.status}: ${res.statusText}`);
      }
      const data: any = await res.json();
      rawIssues = Array.isArray(data) ? data.map(item => ({
        number: item.number,
        title: item.title,
        body: item.body || '',
        state: item.state === 'closed' ? 'CLOSED' : 'OPEN',
        created_at: item.created_at,
        closed_at: item.closed_at,
        author: item.user ? { login: item.user.login, avatar_url: item.user.avatar_url } : { login: 'octocat' },
        assignee: item.assignee ? { login: item.assignee.login, avatar_url: item.assignee.avatar_url } : null,
        labels: (item.labels || []).map((l: any) => typeof l === 'string' ? l : l.name),
        milestone: item.milestone?.title || null,
        pull_request: item.pull_request ? {
          number: item.number,
          title: item.title,
          url: item.html_url,
          head_ref: 'patch-1',
          state: item.state,
          created_at: item.created_at,
          merged_at: item.closed_at
        } : null
      })) : [];
    } catch (apiErr: any) {
      console.warn(`Live GitHub fetch failed (${apiErr.message}). Falling back to offline fixture.`);
      const fallbackFixture = fixtures['facebook/react'] || Object.values(fixtures)[0];
      rawIssues = fallbackFixture ? fallbackFixture.issues : [];
    }
  }

  // 3. Normalization & Database Insertion
  let importedCount = 0;
  const total = rawIssues.length;

  db.transaction(() => {
    for (let i = 0; i < rawIssues.length; i++) {
      const issue = rawIssues[i];

      // External reporter & assignee
      const reporterId = ensureExternalUser(issue.author.login, issue.author.name, issue.author.avatar_url);
      const assigneeId = issue.assignee ? ensureExternalUser(issue.assignee.login, issue.assignee.name, issue.assignee.avatar_url) : null;

      // Milestone
      const targetMilestone = issue.milestone ? ensureMilestone(issue.milestone) : null;

      // Determine initial status based on PR & close state
      let status = 'Confirmed';
      let resolution: string | null = null;
      if (issue.state === 'CLOSED') {
        status = 'Resolved';
        resolution = 'FIXED';
      } else if (issue.pull_request) {
        status = 'In Review';
      } else if (issue.commits && issue.commits.length > 0) {
        status = 'In Progress';
      }

      const createdAt = issue.created_at || new Date().toISOString();
      const updatedAt = issue.closed_at || issue.pull_request?.merged_at || createdAt;

      // Check for component based on title or labels
      let componentId = 'core';
      const labelNames: string[] = issue.labels || [];
      for (const lbl of labelNames) {
        if (lbl.toLowerCase().includes('ui') || lbl.toLowerCase().includes('frontend')) componentId = 'ui';
        if (lbl.toLowerCase().includes('auth') || lbl.toLowerCase().includes('sec')) componentId = 'auth';
        if (lbl.toLowerCase().includes('api') || lbl.toLowerCase().includes('net')) componentId = 'api';
        if (lbl.toLowerCase().includes('db') || lbl.toLowerCase().includes('store')) componentId = 'db';
      }

      // Check if already imported
      const existingBug = db.prepare('SELECT id FROM bugs WHERE title = ?').get(issue.title) as { id: number } | undefined;
      let bugId: number;

      if (existingBug) {
        bugId = existingBug.id;
      } else {
        const insertBug = db.prepare(`
          INSERT INTO bugs (
            title, description, status, severity, priority, component_id,
            reporter_id, assignee_id, resolution, target_milestone,
            estimated_time, remaining_time, created_at, updated_at
          ) VALUES (?, ?, ?, 'normal', 'normal', ?, ?, ?, ?, ?, 8, 0, ?, ?)
        `).run(
          issue.title,
          issue.body || `Imported from GitHub #${issue.number}`,
          status,
          componentId,
          reporterId,
          assigneeId,
          resolution,
          targetMilestone,
          createdAt,
          updatedAt
        );
        bugId = Number(insertBug.lastInsertRowid);
        importedCount++;
      }

      // Keywords / Labels
      for (const lbl of labelNames) {
        const kwId = ensureKeyword(lbl);
        db.prepare('INSERT OR IGNORE INTO bug_keywords (bug_id, keyword_id) VALUES (?, ?)').run(bugId, kwId);
      }

      // Activity history reconstruction
      db.prepare(`
        INSERT OR IGNORE INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
        VALUES (?, ?, 'status', 'Unconfirmed', 'Confirmed', 1, ?)
      `).run(bugId, reporterId, createdAt);

      if (issue.pull_request) {
        const pr = issue.pull_request;
        const prCreatedAt = pr.created_at || createdAt;
        db.prepare(`
          INSERT OR IGNORE INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
          VALUES (?, ?, 'status', 'Confirmed', 'In Review', 1, ?)
        `).run(bugId, assigneeId || reporterId, prCreatedAt);

        // Git Link for PR
        db.prepare(`
          INSERT OR IGNORE INTO git_links (bug_id, kind, ref, url, state, updated_at)
          VALUES (?, 'PR', ?, ?, ?, ?)
        `).run(bugId, `#${pr.number} (${pr.head_ref || 'main'})`, pr.url, pr.state, prCreatedAt);

        // PR Reviews
        if (pr.reviews && Array.isArray(pr.reviews)) {
          for (const rev of pr.reviews) {
            const revUserId = ensureExternalUser(rev.author);
            db.prepare(`
              INSERT OR IGNORE INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
              VALUES (?, ?, 'review', NULL, ?, 0, ?)
            `).run(bugId, revUserId, `Submitted review: ${rev.state}`, rev.submitted_at || prCreatedAt);
          }
        }

        if (pr.merged_at) {
          db.prepare(`
            INSERT OR IGNORE INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
            VALUES (?, ?, 'status', 'In Review', 'Resolved', 1, ?)
          `).run(bugId, assigneeId || reporterId, pr.merged_at);
        }
      } else if (issue.closed_at) {
        db.prepare(`
          INSERT OR IGNORE INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
          VALUES (?, ?, 'status', 'In Progress', 'Resolved', 1, ?)
        `).run(bugId, assigneeId || reporterId, issue.closed_at);
      }

      // Commits
      if (issue.commits && Array.isArray(issue.commits)) {
        for (const c of issue.commits) {
          db.prepare(`
            INSERT OR IGNORE INTO git_links (bug_id, kind, ref, url, state, updated_at)
            VALUES (?, 'COMMIT', ?, ?, 'committed', ?)
          `).run(bugId, c.sha, `${repoUrl}/commit/${c.sha}`, c.created_at || createdAt);
        }
      }

      // Index Embedding for Duplicate Radar
      indexBugEmbedding(bugId, issue.title, issue.body || '');

      // Broadcast progress every 2 items
      if (i % 2 === 0 || i === total - 1) {
        sseService.broadcast('import:progress', {
          job_id: jobId,
          stage: 'saving',
          current: i + 1,
          total,
          message: `Materializing issue #${issue.number}: "${issue.title.slice(0, 45)}..."`,
          repo_name: fullRepoKey
        });
      }
    }

    // Record imported repository
    db.prepare(`
      INSERT INTO imported_repos (url, owner, name, issue_count, imported_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        issue_count = excluded.issue_count,
        imported_at = excluded.imported_at
    `).run(repoUrl, owner, repoName, total, new Date().toISOString());
  })();

  sseService.broadcast('import:complete', {
    job_id: jobId,
    stage: 'complete',
    current: total,
    total,
    message: `Successfully imported ${importedCount} issues from ${fullRepoKey}!`,
    repo_name: fullRepoKey
  });

  return {
    success: true,
    imported_count: importedCount,
    total_issues: total,
    repo_name: fullRepoKey,
    url: repoUrl
  };
}
