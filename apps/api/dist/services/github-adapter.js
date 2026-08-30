import crypto from 'crypto';
import { db } from '../db/database.js';
import { defaultWorkflowConfig, validateTransition } from '@triarc/engine';
import { sseService } from './sse.js';
if (process.env.NODE_ENV === 'production' && !process.env.GITHUB_WEBHOOK_SECRET) {
    throw new Error('FATAL: GITHUB_WEBHOOK_SECRET environment variable must be set in production mode.');
}
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'triarc-webhook-secret';
if (!process.env.GITHUB_WEBHOOK_SECRET && process.env.NODE_ENV !== 'test') {
    console.warn('\x1b[33m⚠️  [SECURITY WARNING] Using default fallback GITHUB_WEBHOOK_SECRET. Set GITHUB_WEBHOOK_SECRET in production.\x1b[0m');
}
export function verifyGitHubSignature(payload, signatureHeader) {
    if (!signatureHeader)
        return false;
    try {
        const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
        const digest = 'sha256=' + hmac.update(payload).digest('hex');
        const bufDigest = Buffer.from(digest);
        const bufSig = Buffer.from(signatureHeader);
        if (bufDigest.length !== bufSig.length) {
            return false;
        }
        return crypto.timingSafeEqual(bufDigest, bufSig);
    }
    catch (err) {
        return false;
    }
}
export function parseBugIdsFromText(text) {
    const bugIds = [];
    const regex = /(?:fixes|closes|resolves|refs|see)\s+#(\d+)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const id = parseInt(match[1], 10);
        if (!isNaN(id) && !bugIds.includes(id)) {
            bugIds.push(id);
        }
    }
    // Also check direct #123 mentions if branch name or short string
    const branchRegex = /(?:bug|issue|fix)[/-](\d+)/gi;
    while ((match = branchRegex.exec(text)) !== null) {
        const id = parseInt(match[1], 10);
        if (!isNaN(id) && !bugIds.includes(id)) {
            bugIds.push(id);
        }
    }
    return bugIds;
}
export function processGitHubEvent(event) {
    const actions = [];
    const bugIds = [];
    const nowIso = new Date().toISOString();
    // 1. Process commit event
    if (event.kind === 'commit' && event.commit_message) {
        const foundBugIds = parseBugIdsFromText(event.commit_message);
        for (const bugId of foundBugIds) {
            bugIds.push(bugId);
            const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId);
            if (!bug)
                continue;
            // Add Git link
            db.prepare(`
        INSERT INTO git_links (bug_id, kind, ref, url, state, updated_at)
        VALUES (?, 'COMMIT', ?, ?, 'active', ?)
      `).run(bugId, event.commit_hash?.substring(0, 7) || event.ref || 'commit', event.url || `https://github.com/org/repo/commit/${event.commit_hash}`, nowIso);
            // Record commit activity
            db.prepare(`
        INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
        VALUES (?, NULL, 'git_commit', NULL, ?, 1, ?)
      `).run(bugId, `Commit ${event.commit_hash?.substring(0, 7) || ''}: ${event.commit_message}`, nowIso);
            // If message says "Fixes #...", attempt automated transition to Resolved
            const isFix = /(?:fixes|closes|resolves)\s+#\d+/i.test(event.commit_message);
            if (isFix) {
                const validation = validateTransition(defaultWorkflowConfig, bug.status, 'Resolved', 'developer', {
                    isAutomated: true,
                    comment: `Automated fix via git commit ${event.commit_hash?.substring(0, 7) || ''}`,
                    fields: { resolution: 'FIXED' }
                });
                if (validation.valid) {
                    db.prepare(`
            UPDATE bugs
            SET status = 'Resolved', resolution = 'FIXED', updated_at = ?
            WHERE id = ?
          `).run(nowIso, bugId);
                    db.prepare(`
            INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
            VALUES (?, NULL, 'status', ?, 'Resolved', 1, ?)
          `).run(bugId, bug.status, nowIso);
                    actions.push(`Bug #${bugId} automatically transitioned from '${bug.status}' to 'Resolved' via commit`);
                    sseService.broadcast('bug:updated', { bug_id: bugId, status: 'Resolved', automated: true });
                }
                else {
                    actions.push(`Automated transition to Resolved rejected for #${bugId}: ${validation.reason}`);
                }
            }
        }
    }
    // 2. Process Pull Request event
    if (event.kind === 'pull_request') {
        const textToScan = `${event.pr_title || ''} ${event.ref || ''}`;
        const foundBugIds = parseBugIdsFromText(textToScan);
        for (const bugId of foundBugIds) {
            bugIds.push(bugId);
            const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId);
            if (!bug)
                continue;
            const prState = event.pr_state || 'open';
            const prRef = `PR #${event.pr_number || ''}: ${event.pr_title || ''}`;
            // Insert or update git_link
            db.prepare(`
        INSERT INTO git_links (bug_id, kind, ref, url, state, updated_at)
        VALUES (?, 'PR', ?, ?, ?, ?)
      `).run(bugId, prRef, event.url || `https://github.com/org/repo/pull/${event.pr_number}`, prState, nowIso);
            // Record PR activity
            db.prepare(`
        INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
        VALUES (?, NULL, 'git_pr', ?, ?, 1, ?)
      `).run(bugId, event.action || 'opened', prRef, nowIso);
            // If PR opened and bug is In Progress -> auto-transition to In Review
            if (event.action === 'opened' && bug.status === 'In Progress') {
                const validation = validateTransition(defaultWorkflowConfig, bug.status, 'In Review', 'developer', { isAutomated: true });
                if (validation.valid) {
                    db.prepare(`
            UPDATE bugs SET status = 'In Review', updated_at = ? WHERE id = ?
          `).run(nowIso, bugId);
                    db.prepare(`
            INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
            VALUES (?, NULL, 'status', 'In Progress', 'In Review', 1, ?)
          `).run(bugId, nowIso);
                    actions.push(`Bug #${bugId} automatically moved to 'In Review' on PR #${event.pr_number} open`);
                    sseService.broadcast('bug:updated', { bug_id: bugId, status: 'In Review', automated: true });
                }
            }
            // If PR merged -> auto-transition to Resolved
            if (event.action === 'closed' && event.pr_state === 'merged' && (bug.status === 'In Review' || bug.status === 'In Progress')) {
                const validation = validateTransition(defaultWorkflowConfig, bug.status, 'Resolved', 'developer', {
                    isAutomated: true,
                    comment: `Automated fix via merged PR #${event.pr_number}`,
                    fields: { resolution: 'FIXED' }
                });
                if (validation.valid) {
                    db.prepare(`
            UPDATE bugs SET status = 'Resolved', resolution = 'FIXED', updated_at = ? WHERE id = ?
          `).run(nowIso, bugId);
                    db.prepare(`
            INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
            VALUES (?, NULL, 'status', ?, 'Resolved', 1, ?)
          `).run(bugId, bug.status, nowIso);
                    actions.push(`Bug #${bugId} automatically Resolved via merged PR #${event.pr_number}`);
                    sseService.broadcast('bug:updated', { bug_id: bugId, status: 'Resolved', automated: true });
                }
            }
        }
    }
    // 3. Process PR Review Approval event
    if (event.kind === 'pull_request_review' && event.review_state === 'approved') {
        const textToScan = `${event.pr_title || ''} ${event.ref || ''}`;
        const foundBugIds = parseBugIdsFromText(textToScan);
        for (const bugId of foundBugIds) {
            bugIds.push(bugId);
            // Auto-resolve open review? flags
            const openReviewFlags = db.prepare(`
        SELECT f.*, ft.grant_role, ft.request_role, ft.name as type_name
        FROM flags f
        JOIN flag_types ft ON f.type_id = ft.id
        WHERE f.bug_id = ? AND f.status = '?' AND ft.name = 'review?'
      `).all(bugId);
            for (const flag of openReviewFlags) {
                db.prepare(`
          UPDATE flags SET status = '+', resolved_at = ? WHERE id = ?
        `).run(nowIso, flag.id);
                db.prepare(`
          INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
          VALUES (?, NULL, 'flag_resolved', '?', '+', 1, ?)
        `).run(bugId, nowIso);
                actions.push(`review? flag #${flag.id} on bug #${bugId} automatically approved via GitHub PR review`);
                sseService.broadcast('flag:resolved', { flag_id: flag.id, bug_id: bugId, status: '+', automated: true });
            }
        }
    }
    return {
        success: true,
        actions,
        bugIds
    };
}
//# sourceMappingURL=github-adapter.js.map