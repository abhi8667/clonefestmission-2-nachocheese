import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/database.js';
import { initializeDatabase } from '../db/schema.js';
import { indexBugEmbedding } from './duplicate-radar.js';
import { sseService } from './sse.js';
import type { GitCommit, CollaboratorTelemetry, ProjectGitTelemetry } from '@triarc/shared-types';


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
  projectId?: string;
  creatorUserId?: string;
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
  const targetProjectId = options.projectId || 'prj_core';

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
      if (res.ok) {
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
      }

      // Also fetch live commits from repository
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=30`, { headers });
        if (commitsRes.ok) {
          const commitsData: any = await commitsRes.json();
          if (Array.isArray(commitsData) && commitsData.length > 0) {
            const liveCommits = commitsData.map((c: any) => ({
              sha: c.sha || 'head',
              message: c.commit?.message || 'Commit on main',
              created_at: c.commit?.author?.date || new Date().toISOString(),
              author: {
                login: c.author?.login || c.commit?.author?.name || 'developer',
                name: c.commit?.author?.name || c.author?.login || 'Collaborator',
                avatar_url: c.author?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.author?.login || 'collab'}`
              }
            }));

            if (rawIssues.length === 0) {
              rawIssues.push({
                number: 1,
                title: `Telemetry and flow pipeline initialized for ${fullRepoKey}`,
                body: `Repository ${fullRepoKey} successfully linked to Triarc. Ingested ${liveCommits.length} commits and tracking collaborator activity.`,
                state: 'OPEN',
                created_at: liveCommits[0]?.created_at || new Date().toISOString(),
                closed_at: null,
                author: liveCommits[0]?.author || { login: owner },
                assignee: null,
                labels: ['Component: Core', 'Type: Task', 'Resolution: Active'],
                milestone: 'v1.0.0',
                pull_request: null,
                commits: liveCommits
              });
            } else {
              rawIssues[0].commits = [...(rawIssues[0].commits || []), ...liveCommits];
            }
          }
        }
      } catch (commitsErr: any) {
        console.warn(`Live GitHub commits fetch note: ${commitsErr.message}`);
      }

      // If still 0 issues, generate a starter tracking issue
      if (rawIssues.length === 0) {
        rawIssues.push({
          number: 1,
          title: `Project workspace initialized for ${fullRepoKey}`,
          body: `Live repository connection established for ${repoUrl}. Ready to track bugs, PRs, and flow metrics.`,
          state: 'OPEN',
          created_at: new Date().toISOString(),
          closed_at: null,
          author: { login: owner },
          assignee: null,
          labels: ['Component: Core', 'Type: Task'],
          milestone: null,
          pull_request: null,
          commits: []
        });
      }
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
    // Ensure project components exist
    const compNames = ['core', 'ui', 'api', 'auth', 'db'];
    for (const cName of compNames) {
      db.prepare(`
        INSERT OR IGNORE INTO components (id, name, description, project_id)
        VALUES (?, ?, ?, ?)
      `).run(`${targetProjectId}_${cName}`, cName.toUpperCase(), `${cName} subsystem`, targetProjectId);
    }

    // Add creator user as admin if present
    if (options.creatorUserId) {
      db.prepare(`
        INSERT OR REPLACE INTO project_members (project_id, user_id, role)
        VALUES (?, ?, 'admin')
      `).run(targetProjectId, options.creatorUserId);
    }

    for (let i = 0; i < rawIssues.length; i++) {
      const issue = rawIssues[i];

      // External reporter & assignee
      const reporterId = ensureExternalUser(issue.author.login, issue.author.name, issue.author.avatar_url);
      const assigneeId = issue.assignee ? ensureExternalUser(issue.assignee.login, issue.assignee.name, issue.assignee.avatar_url) : null;

      // Add collaborators to project members
      db.prepare(`
        INSERT OR IGNORE INTO project_members (project_id, user_id, role)
        VALUES (?, ?, 'developer')
      `).run(targetProjectId, reporterId);

      if (assigneeId) {
        db.prepare(`
          INSERT OR IGNORE INTO project_members (project_id, user_id, role)
          VALUES (?, ?, 'developer')
        `).run(targetProjectId, assigneeId);
      }

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
      let componentId = `${targetProjectId}_core`;
      const labelNames: string[] = issue.labels || [];
      for (const lbl of labelNames) {
        if (lbl.toLowerCase().includes('ui') || lbl.toLowerCase().includes('frontend')) componentId = `${targetProjectId}_ui`;
        if (lbl.toLowerCase().includes('auth') || lbl.toLowerCase().includes('sec')) componentId = `${targetProjectId}_auth`;
        if (lbl.toLowerCase().includes('api') || lbl.toLowerCase().includes('net')) componentId = `${targetProjectId}_api`;
        if (lbl.toLowerCase().includes('db') || lbl.toLowerCase().includes('store')) componentId = `${targetProjectId}_db`;
      }

      // Check if already imported
      const existingBug = db.prepare('SELECT id FROM bugs WHERE title = ? AND project_id = ?').get(issue.title, targetProjectId) as { id: number } | undefined;
      let bugId: number;

      if (existingBug) {
        bugId = existingBug.id;
      } else {
        const insertBug = db.prepare(`
          INSERT INTO bugs (
            title, description, status, severity, priority, component_id, project_id,
            reporter_id, assignee_id, resolution, target_milestone,
            estimated_time, remaining_time, created_at, updated_at
          ) VALUES (?, ?, ?, 'normal', 'normal', ?, ?, ?, ?, ?, ?, 8, 0, ?, ?)
        `).run(
          issue.title,
          issue.body || `Imported from GitHub #${issue.number}`,
          status,
          componentId,
          targetProjectId,
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

          db.prepare(`
            INSERT OR IGNORE INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
            VALUES (?, ?, 'git_commit', NULL, ?, 1, ?)
          `).run(bugId, reporterId, `Commit ${c.sha.slice(0, 7)}: ${c.message}`, c.created_at || createdAt);
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
    url: repoUrl,
    project_id: targetProjectId
  };
}

export async function getProjectGitTelemetry(projectKeyOrId: string, viewerToken?: string) {
  const project = db.prepare(`
    SELECT * FROM projects WHERE UPPER(key) = ? OR id = ?
  `).get(projectKeyOrId.toUpperCase(), projectKeyOrId) as any;

  if (!project) {
    throw new Error(`Project '${projectKeyOrId}' not found`);
  }

  const repoUrl = project.repo_url || `https://github.com/triarc/${project.key.toLowerCase()}`;
  const parsed = parseGitHubUrl(repoUrl);

  let commits: GitCommit[] = [];
  let collaborators: CollaboratorTelemetry[] = [];
  let branches: { name: string; is_default: boolean; is_sleeper: boolean; last_commit_at: string; author: string }[] = [];

  // 1. If this is a real GitHub repository URL, fetch REAL LIVE data from GitHub REST API
  if (parsed && !repoUrl.includes('triarc/') && !repoUrl.includes('example.com')) {
    const { owner, name: repoName } = parsed;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Triarc-Bug-Tracker/1.0'
    };
    // The viewer's own linked account takes priority: it is what makes their
    // private repositories visible, and it carries their rate limit rather
    // than the shared server one.
    const effectiveToken = viewerToken || process.env.GITHUB_TOKEN;
    if (effectiveToken) {
      headers['Authorization'] = `token ${effectiveToken}`;
    }

    try {
      // Resolve the default branch first so commits can be attributed to the
      // branch they actually live on — labelling everything 'main' would
      // collapse the whole network graph onto a single lane.
      let defaultBranch = 'main';
      try {
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });
        if (repoRes.ok) {
          const repoMeta: any = await repoRes.json();
          if (repoMeta?.default_branch) defaultBranch = repoMeta.default_branch;
        }
      } catch { /* fall back to 'main' */ }

      const mapCommit = (c: any, branch: string): GitCommit => {
        const authorLogin = c.author?.login || c.commit?.author?.name || 'developer';
        const authorName = c.commit?.author?.name || c.author?.login || 'Collaborator';
        const avatarUrl = c.author?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorLogin}`;
        const message = c.commit?.message?.split('\n')[0] || 'Update codebase';
        return {
          sha: c.sha,
          short_sha: c.sha.slice(0, 7),
          message,
          author_name: authorName,
          author_username: authorLogin,
          author_avatar: avatarUrl,
          branch,
          created_at: c.commit?.author?.date || new Date().toISOString(),
          url: c.html_url || `${repoUrl}/commit/${c.sha}`,
          bug_id: undefined,
          bug_title: undefined,
          parents: Array.isArray(c.parents) ? c.parents.map((p: any) => p.sha) : []
        };
      };

      // Trunk history.
      const commitsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=30`,
        { headers }
      );
      if (commitsRes.ok) {
        const rawCommits: any = await commitsRes.json();
        if (Array.isArray(rawCommits)) {
          commits = rawCommits.map((c: any) => mapCommit(c, defaultBranch));
        }
      }

      // Side branches: pull a slice of each so divergence points are real.
      // Capped at 6 branches to stay well inside the unauthenticated rate limit.
      try {
        const brRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches?per_page=20`, { headers });
        if (brRes.ok) {
          const rawBr: any = await brRes.json();
          if (Array.isArray(rawBr)) {
            const seen = new Set(commits.map((c) => c.sha));
            const sideBranches = rawBr
              .map((b: any) => b.name)
              .filter((n: string) => n !== defaultBranch)
              .slice(0, 6);

            const perBranch = await Promise.all(
              sideBranches.map(async (name: string) => {
                try {
                  const r = await fetch(
                    `https://api.github.com/repos/${owner}/${repoName}/commits?sha=${encodeURIComponent(name)}&per_page=12`,
                    { headers }
                  );
                  if (!r.ok) return [] as GitCommit[];
                  const raw: any = await r.json();
                  if (!Array.isArray(raw)) return [] as GitCommit[];
                  return raw.map((c: any) => mapCommit(c, name));
                } catch {
                  return [] as GitCommit[];
                }
              })
            );

            // A commit reachable from the trunk belongs to the trunk, so only
            // keep the commits unique to each side branch.
            for (const list of perBranch) {
              for (const c of list) {
                if (seen.has(c.sha)) continue;
                seen.add(c.sha);
                commits.push(c);
              }
            }
          }
        }
      } catch { /* trunk-only graph is still valid */ }

      // Fetch Real Contributors / Collaborators
      const contribsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contributors?per_page=20`, { headers });
      if (contribsRes.ok) {
        const rawContribs: any = await contribsRes.json();
        if (Array.isArray(rawContribs)) {
          collaborators = rawContribs.map((u: any) => {
            const userCommits = commits.filter(c => c.author_username === u.login);
            return {
              id: `gh_${u.login}`,
              username: u.login,
              name: u.login,
              avatar_url: u.avatar_url,
              role: u.site_admin ? 'admin' : 'developer',
              commits_count: u.contributions || userCommits.length || 1,
              prs_count: 0,
              active_branch: userCommits[0]?.branch || 'main',
              current_status: userCommits.length > 0
                ? `Pushed commit ${userCommits[0].short_sha} (${userCommits[0].branch})`
                : `Active contributor · ${u.contributions} commits`,
              last_activity_at: userCommits[0]?.created_at || new Date().toISOString()
            };
          });
        }
      }

      // Fetch Real Branches
      const branchesRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches?per_page=20`, { headers });
      if (branchesRes.ok) {
        const rawBranches: any = await branchesRes.json();
        if (Array.isArray(rawBranches)) {
          branches = rawBranches.map((b: any) => ({
            name: b.name,
            is_default: b.name === 'main' || b.name === 'master',
            is_sleeper: false,
            last_commit_at: commits[0]?.created_at || new Date().toISOString(),
            author: commits[0]?.author_name || owner
          }));
        }
      }
    } catch (liveErr: any) {
      console.warn(`GitHub API live telemetry fetch error: ${liveErr.message}`);
    }
  }

  // 2. Also merge any local SQLite git links or simulated commits recorded for this project
  const commitRows = db.prepare(`
    SELECT
      gl.id as link_id,
      gl.ref as sha,
      gl.url as commit_url,
      gl.updated_at as created_at,
      b.id as bug_id,
      b.title as bug_title,
      u.id as user_id,
      u.username,
      u.name as author_name,
      u.avatar_url,
      a.new_value as commit_message
    FROM git_links gl
    JOIN bugs b ON gl.bug_id = b.id
    LEFT JOIN users u ON b.reporter_id = u.id
    LEFT JOIN activity a ON a.bug_id = b.id AND a.field = 'git_commit'
    WHERE gl.kind = 'COMMIT' AND b.project_id = ?
    ORDER BY gl.updated_at DESC
    LIMIT 100
  `).all(project.id) as any[];

  const localCommits = commitRows.map((r, idx) => {
    const rawMsg = r.commit_message || `Commit ${r.sha.slice(0, 7)} on branch main`;
    const cleanMsg = rawMsg.replace(/^Commit [a-f0-9]+:\s*/i, '');
    return {
      sha: r.sha,
      short_sha: r.sha.slice(0, 7),
      message: cleanMsg,
      author_name: r.author_name || r.username || 'Collaborator',
      author_username: r.username || 'developer',
      author_avatar: r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.username || idx}`,
      branch: r.bug_id ? `fix/issue-${r.bug_id}` : 'main',
      created_at: r.created_at,
      url: r.commit_url || `${repoUrl}/commit/${r.sha}`,
      bug_id: r.bug_id,
      bug_title: r.bug_title
    };
  });

  // Prepend local / simulated commits
  if (localCommits.length > 0) {
    const existingShas = new Set(commits.map(c => c.sha));
    for (const lc of localCommits) {
      if (!existingShas.has(lc.sha)) {
        commits.unshift(lc);
      }
    }
  }

  // If still no commits, fall back to fixtures or defaults
  if (commits.length === 0) {
    const defaultCommits = [
      {
        sha: '7f9a21b8c3d',
        short_sha: '7f9a21b',
        message: 'feat: initialize real-time git flow sync and webhook pipeline',
        author_name: 'Alex River',
        author_username: 'alex',
        author_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alex',
        branch: 'main',
        created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        url: `${repoUrl}/commit/7f9a21b8c3d`,
        bug_id: undefined,
        bug_title: undefined
      },
      {
        sha: '3c8e41a9d02',
        short_sha: '3c8e41a',
        message: 'fix(worker): prevent memory leak during high-throughput JSON parsing',
        author_name: 'Sam Patel',
        author_username: 'sam',
        author_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sam',
        branch: 'fix/worker-leak',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        url: `${repoUrl}/commit/3c8e41a9d02`,
        bug_id: undefined,
        bug_title: undefined
      }
    ];
    commits.push(...defaultCommits);
  }

  // If no collaborators discovered from GitHub API, build from project members
  if (collaborators.length === 0) {
    const memberRows = db.prepare(`
      SELECT DISTINCT u.id, u.username, u.name, u.avatar_url, pm.role
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY u.name ASC
    `).all(project.id) as any[];

    collaborators = memberRows.map((m) => {
      const userCommits = commits.filter((c) => c.author_username === m.username || c.author_name === m.name);
      const prCount = db.prepare(`
        SELECT COUNT(*) as count FROM bugs WHERE project_id = ? AND (reporter_id = ? OR assignee_id = ?) AND status = 'In Review'
      `).get(project.id, m.id, m.id) as { count: number };

      let currentStatus = 'Active in workspace';
      if (userCommits.length > 0) {
        currentStatus = `Pushed commit ${userCommits[0].short_sha} (${userCommits[0].branch})`;
      } else {
        currentStatus = 'Monitoring triage queue';
      }

      return {
        id: m.id,
        username: m.username,
        name: m.name,
        avatar_url: m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.username}`,
        role: m.role || 'developer',
        commits_count: userCommits.length || 1,
        prs_count: prCount?.count || 0,
        active_branch: userCommits[0]?.branch || 'main',
        current_status: currentStatus,
        last_activity_at: userCommits[0]?.created_at || new Date().toISOString()
      };
    });
  }

  // Extract branches from commit set if not fetched
  if (branches.length === 0) {
    const branchMap = new Map<string, { lastCommit: string; author: string }>();
    branchMap.set('main', { lastCommit: commits[0]?.created_at || new Date().toISOString(), author: commits[0]?.author_name || 'System' });

    for (const c of commits) {
      if (c.branch && !branchMap.has(c.branch)) {
        branchMap.set(c.branch, { lastCommit: c.created_at, author: c.author_name });
      }
    }

    const now = Date.now();
    branches = Array.from(branchMap.entries()).map(([name, info]) => {
      const ageMs = now - new Date(info.lastCommit).getTime();
      const isSleeper = ageMs > 3 * 24 * 60 * 60 * 1000 && name !== 'main';
      return {
        name,
        is_default: name === 'main' || name === 'master',
        is_sleeper: isSleeper,
        last_commit_at: info.lastCommit,
        author: info.author
      };
    });
  }

  const prCount = db.prepare(`
    SELECT COUNT(*) as count FROM git_links gl JOIN bugs b ON gl.bug_id = b.id WHERE b.project_id = ? AND gl.kind = 'PR'
  `).get(project.id) as { count: number };

  return {
    repo_url: repoUrl,
    commits,
    collaborators,
    branches,
    stats: {
      total_commits: commits.length,
      total_collaborators: collaborators.length,
      active_branches: branches.length,
      open_prs: prCount?.count || 0
    }
  };
}


export function simulateProjectCommit(
  projectKeyOrId: string,
  data: { author: string; message: string; branch?: string; bugId?: number }
) {
  const project = db.prepare(`
    SELECT * FROM projects WHERE UPPER(key) = ? OR id = ?
  `).get(projectKeyOrId.toUpperCase(), projectKeyOrId) as any;

  if (!project) {
    throw new Error(`Project '${projectKeyOrId}' not found`);
  }

  const authorUser = db.prepare('SELECT * FROM users WHERE username = ? OR id = ?').get(data.author, data.author) as any || {
    id: `gh_${data.author}`,
    name: data.author,
    username: data.author,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.author}`
  };

  const hash = Math.random().toString(36).substring(2, 9);
  const nowIso = new Date().toISOString();
  const branch = data.branch || 'main';

  // If linked to a bug, insert git_link and activity
  if (data.bugId) {
    db.prepare(`
      INSERT INTO git_links (bug_id, kind, ref, url, state, updated_at)
      VALUES (?, 'COMMIT', ?, ?, 'committed', ?)
    `).run(data.bugId, hash, `${project.repo_url || 'https://github.com/org/repo'}/commit/${hash}`, nowIso);

    db.prepare(`
      INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
      VALUES (?, ?, 'git_commit', NULL, ?, 1, ?)
    `).run(data.bugId, authorUser.id, `Commit ${hash}: ${data.message}`, nowIso);
  }

  const commitEvent = {
    sha: hash,
    short_sha: hash.slice(0, 7),
    message: data.message,
    author_name: authorUser.name || authorUser.username,
    author_username: authorUser.username,
    author_avatar: authorUser.avatar_url,
    branch,
    created_at: nowIso,
    url: `${project.repo_url || 'https://github.com/org/repo'}/commit/${hash}`,
    bug_id: data.bugId,
    project_key: project.key
  };

  sseService.broadcast('git:commit', commitEvent);
  return commitEvent;
}

