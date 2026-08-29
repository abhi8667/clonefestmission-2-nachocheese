import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { canUserViewBug, getSecurityFilterSQL } from '../middleware/security.js';
import {
  defaultWorkflowConfig,
  validateTransition,
  getAvailableTransitions,
  deriveFlowMetrics,
  parseSearchQuery,
  validateRelationship,
  computeActivitySparkline,
  computeSlaStatus
} from '@triarc/engine';
import {
  Bug,
  Activity,
  Flag,
  Relationship,
  GitLink,
  Comment,
  TimelineItem,
  BulkTransitionResult,
  Keyword,
  Milestone,
  Version,
  User
} from '@triarc/shared-types';
import { indexBugEmbedding, findDuplicates } from '../services/duplicate-radar.js';
import { sseService } from '../services/sse.js';

export const bugsRouter = Router();

// Helper to notify watchers of a bug on events
export function notifyWatchers(bugId: number, actorId: string | null, type: string, message: string) {
  const watchers = db.prepare('SELECT user_id FROM watchers WHERE bug_id = ?').all(bugId) as { user_id: string }[];
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, bug_id, type, message, read, created_at)
    VALUES (?, ?, ?, ?, 0, datetime('now'))
  `);

  for (const w of watchers) {
    if (w.user_id !== actorId) {
      try {
        insertNotif.run(w.user_id, bugId, type, message);
        sseService.broadcast('notification:created', {
          user_id: w.user_id,
          bug_id: bugId,
          type,
          message
        });
      } catch (err) {
        // Continue if notification insert fails
      }
    }
  }
}

// GET /api/keywords - List all keywords
bugsRouter.get('/keywords', (req: AuthenticatedRequest, res: Response) => {
  const keywords = db.prepare('SELECT * FROM keywords ORDER BY name ASC').all() as Keyword[];
  res.json({ keywords });
});

// GET /api/milestones - List all milestones with open/closed stats
bugsRouter.get('/milestones', (req: AuthenticatedRequest, res: Response) => {
  const milestones = db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(*) FROM bugs WHERE bugs.target_milestone = m.name AND bugs.status NOT IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')) as open_bugs_count,
      (SELECT COUNT(*) FROM bugs WHERE bugs.target_milestone = m.name AND bugs.status IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')) as closed_bugs_count
    FROM milestones m
    ORDER BY m.name ASC
  `).all() as Milestone[];

  res.json({ milestones });
});

// GET /api/versions - List all versions
bugsRouter.get('/versions', (req: AuthenticatedRequest, res: Response) => {
  const versions = db.prepare('SELECT * FROM versions ORDER BY name DESC').all() as Version[];
  res.json({ versions });
});

// GET /api/bugs - List and search bugs
bugsRouter.get('/bugs', (req: AuthenticatedRequest, res: Response) => {
  const queryParam = req.query.query as string | undefined;
  const statusParam = req.query.status as string | undefined;
  const priorityParam = req.query.priority as string | undefined;
  const severityParam = req.query.severity as string | undefined;
  const componentParam = req.query.component as string | undefined;
  const assigneeParam = req.query.assignee as string | undefined;
  const milestoneParam = req.query.milestone as string | undefined;
  const keywordParam = req.query.keyword as string | undefined;

  const security = getSecurityFilterSQL(req.user);
  let whereClauses: string[] = [security.sql];
  let params: any[] = [...security.params];

  if (queryParam) {
    const parsed = parseSearchQuery(queryParam);

    if (parsed.statuses && parsed.statuses.length > 0) {
      const placeholders = parsed.statuses.map(() => '?').join(',');
      whereClauses.push(`bugs.status IN (${placeholders})`);
      params.push(...parsed.statuses);
    }

    if (parsed.priorities && parsed.priorities.length > 0) {
      const placeholders = parsed.priorities.map(() => '?').join(',');
      whereClauses.push(`LOWER(bugs.priority) IN (${placeholders})`);
      params.push(...parsed.priorities);
    }

    if (parsed.severities && parsed.severities.length > 0) {
      const placeholders = parsed.severities.map(() => '?').join(',');
      whereClauses.push(`LOWER(bugs.severity) IN (${placeholders})`);
      params.push(...parsed.severities);
    }

    if (parsed.components && parsed.components.length > 0) {
      const placeholders = parsed.components.map(() => '?').join(',');
      whereClauses.push(`bugs.component_id IN (${placeholders})`);
      params.push(...parsed.components);
    }

    if (parsed.milestones && parsed.milestones.length > 0) {
      const placeholders = parsed.milestones.map(() => '?').join(',');
      whereClauses.push(`bugs.target_milestone IN (${placeholders})`);
      params.push(...parsed.milestones);
    }

    if (parsed.versions && parsed.versions.length > 0) {
      const placeholders = parsed.versions.map(() => '?').join(',');
      whereClauses.push(`bugs.version IN (${placeholders})`);
      params.push(...parsed.versions);
    }

    if (parsed.keywords && parsed.keywords.length > 0) {
      for (const kw of parsed.keywords) {
        whereClauses.push(`bugs.id IN (
          SELECT bug_id FROM bug_keywords bk
          JOIN keywords k ON bk.keyword_id = k.id
          WHERE LOWER(k.name) = ? OR LOWER(k.id) = ?
        )`);
        params.push(kw.toLowerCase(), kw.toLowerCase());
      }
    }

    if (parsed.isWatched && req.user) {
      whereClauses.push(`bugs.id IN (SELECT bug_id FROM watchers WHERE user_id = ?)`);
      params.push(req.user.id);
    }

    if (parsed.watchers && parsed.watchers.length > 0) {
      for (const w of parsed.watchers) {
        if (w === 'me' && req.user) {
          whereClauses.push(`bugs.id IN (SELECT bug_id FROM watchers WHERE user_id = ?)`);
          params.push(req.user.id);
        } else {
          whereClauses.push(`bugs.id IN (
            SELECT w.bug_id FROM watchers w
            JOIN users u ON w.user_id = u.id
            WHERE u.username = ? OR u.name LIKE ?
          )`);
          params.push(w, `%${w}%`);
        }
      }
    }

    if (parsed.assignees && parsed.assignees.length > 0) {
      for (const a of parsed.assignees) {
        if (a === 'me' && req.user) {
          whereClauses.push(`bugs.assignee_id = ?`);
          params.push(req.user.id);
        } else if (a === 'unassigned') {
          whereClauses.push(`bugs.assignee_id IS NULL`);
        } else {
          whereClauses.push(`bugs.assignee_id IN (
            SELECT id FROM users WHERE username LIKE ? OR name LIKE ?
          )`);
          params.push(`%${a}%`, `%${a}%`);
        }
      }
    }

    if (parsed.text && parsed.text.length > 0) {
      for (const t of parsed.text) {
        whereClauses.push(`(bugs.title LIKE ? OR bugs.description LIKE ?)`);
        params.push(`%${t}%`, `%${t}%`);
      }
    }

    if (parsed.changedTo) {
      whereClauses.push(`bugs.id IN (
        SELECT bug_id FROM activity WHERE field = 'status' AND new_value LIKE ?
      )`);
      params.push(`%${parsed.changedTo}%`);
    }
  }

  if (statusParam) {
    const statuses = statusParam.split(',');
    const placeholders = statuses.map(() => '?').join(',');
    whereClauses.push(`bugs.status IN (${placeholders})`);
    params.push(...statuses);
  }

  if (priorityParam) {
    whereClauses.push(`bugs.priority = ?`);
    params.push(priorityParam);
  }

  if (severityParam) {
    whereClauses.push(`bugs.severity = ?`);
    params.push(severityParam);
  }

  if (componentParam) {
    whereClauses.push(`bugs.component_id = ?`);
    params.push(componentParam);
  }

  if (milestoneParam) {
    whereClauses.push(`bugs.target_milestone = ?`);
    params.push(milestoneParam);
  }

  if (keywordParam) {
    whereClauses.push(`bugs.id IN (
      SELECT bug_id FROM bug_keywords bk
      JOIN keywords k ON bk.keyword_id = k.id
      WHERE LOWER(k.name) = ? OR LOWER(k.id) = ?
    )`);
    params.push(keywordParam.toLowerCase(), keywordParam.toLowerCase());
  }

  if (assigneeParam) {
    if (assigneeParam === 'me' && req.user) {
      whereClauses.push(`bugs.assignee_id = ?`);
      params.push(req.user.id);
    } else if (assigneeParam === 'unassigned') {
      whereClauses.push(`bugs.assignee_id IS NULL`);
    } else {
      whereClauses.push(`bugs.assignee_id = ?`);
      params.push(assigneeParam);
    }
  }

  const sql = `
    SELECT
      bugs.*,
      c.name as component_name,
      u_reporter.id as rep_id, u_reporter.username as rep_username, u_reporter.name as rep_name, u_reporter.email as rep_email, u_reporter.role as rep_role, u_reporter.avatar_url as rep_avatar,
      u_assignee.id as ass_id, u_assignee.username as ass_username, u_assignee.name as ass_name, u_assignee.email as ass_email, u_assignee.role as ass_role, u_assignee.avatar_url as ass_avatar,
      (SELECT COUNT(*) FROM comments WHERE comments.bug_id = bugs.id) as comments_count
    FROM bugs
    LEFT JOIN components c ON bugs.component_id = c.id
    LEFT JOIN users u_reporter ON bugs.reporter_id = u_reporter.id
    LEFT JOIN users u_assignee ON bugs.assignee_id = u_assignee.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY bugs.id DESC
  `;

  const rows = db.prepare(sql).all(...params) as any[];
  const bugIds = rows.map((r) => r.id);

  // Fetch activities for sparklines and SLA computation in batch
  const activitiesByBug: Record<number, Activity[]> = {};
  const keywordsByBug: Record<number, Keyword[]> = {};

  if (bugIds.length > 0) {
    const placeholders = bugIds.map(() => '?').join(',');
    const actRows = db.prepare(`
      SELECT * FROM activity
      WHERE bug_id IN (${placeholders})
      ORDER BY created_at ASC
    `).all(...bugIds) as Activity[];

    for (const act of actRows) {
      if (!activitiesByBug[act.bug_id]) activitiesByBug[act.bug_id] = [];
      activitiesByBug[act.bug_id].push(act);
    }

    const kwRows = db.prepare(`
      SELECT bk.bug_id, k.*
      FROM bug_keywords bk
      JOIN keywords k ON bk.keyword_id = k.id
      WHERE bk.bug_id IN (${placeholders})
    `).all(...bugIds) as (Keyword & { bug_id: number })[];

    for (const kw of kwRows) {
      if (!keywordsByBug[kw.bug_id]) keywordsByBug[kw.bug_id] = [];
      keywordsByBug[kw.bug_id].push({ id: kw.id, name: kw.name, description: kw.description });
    }
  }

  const bugs = rows.map((r) => {
    const bugActs = activitiesByBug[r.id] || [];
    const sparkline = computeActivitySparkline(bugActs, 14);

    const bugObj: Bug = {
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      severity: r.severity,
      priority: r.priority,
      component_id: r.component_id,
      component_name: r.component_name || r.component_id,
      reporter_id: r.reporter_id,
      assignee_id: r.assignee_id,
      resolution: r.resolution,
      duplicate_of: r.duplicate_of,
      security_group_id: r.security_group_id,
      version: r.version,
      target_milestone: r.target_milestone,
      estimated_time: r.estimated_time || 0,
      remaining_time: r.remaining_time || 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
      comments_count: r.comments_count || 0,
      activity_sparkline: sparkline,
      keywords: keywordsByBug[r.id] || [],
      reporter: r.rep_id ? {
        id: r.rep_id,
        username: r.rep_username,
        name: r.rep_name,
        email: r.rep_email,
        role: r.rep_role,
        avatar_url: r.rep_avatar
      } : undefined,
      assignee: r.ass_id ? {
        id: r.ass_id,
        username: r.ass_username,
        name: r.ass_name,
        email: r.ass_email,
        role: r.ass_role,
        avatar_url: r.ass_avatar
      } : null
    };

    const flowMetrics = deriveFlowMetrics(bugObj, bugActs);
    bugObj.sla_status = computeSlaStatus(bugObj, flowMetrics);

    return bugObj;
  });

  res.json({
    bugs,
    count: bugs.length
  });
});

// POST /api/bugs - Create a new bug
bugsRouter.post('/bugs', (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    description,
    severity = 'normal',
    priority = 'normal',
    component_id,
    assignee_id = null,
    security_group_id = null,
    version = null,
    target_milestone = null,
    estimated_time = 0,
    keyword_ids = []
  } = req.body;

  if (!title || !description || !component_id) {
    return res.status(400).json({ error: 'Title, description, and component_id are required' });
  }

  const reporterId = req.user ? req.user.id : 'u_alex';
  const initialStatus = 'Unconfirmed';
  const nowIso = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO bugs (
      title, description, status, severity, priority, component_id, reporter_id, assignee_id, security_group_id, version, target_milestone, estimated_time, remaining_time, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    title.trim(),
    description.trim(),
    initialStatus,
    severity,
    priority,
    component_id,
    reporterId,
    assignee_id,
    security_group_id,
    version,
    target_milestone,
    Number(estimated_time) || 0,
    Number(estimated_time) || 0,
    nowIso,
    nowIso
  );

  const bugId = Number(result.lastInsertRowid);

  // Auto-add reporter as watcher
  try {
    db.prepare('INSERT INTO watchers (bug_id, user_id, created_at) VALUES (?, ?, ?)').run(bugId, reporterId, nowIso);
  } catch (err) {}

  // Link keywords
  if (Array.isArray(keyword_ids)) {
    const insertBk = db.prepare('INSERT INTO bug_keywords (bug_id, keyword_id) VALUES (?, ?)');
    for (const kwId of keyword_ids) {
      try {
        insertBk.run(bugId, kwId);
      } catch (err) {}
    }
  }

  // Write initial activity row
  db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, 'status', NULL, ?, 0, ?)
  `).run(bugId, reporterId, initialStatus, nowIso);

  // Index for duplicate radar
  indexBugEmbedding(bugId, title, description);

  // Check for duplicate warnings
  const duplicates = findDuplicates(title, description, bugId, req.user);

  // Broadcast SSE
  sseService.broadcast('bug:created', { bug_id: bugId, title, status: initialStatus });

  res.status(201).json({
    id: bugId,
    title,
    status: initialStatus,
    duplicates,
    message: 'Bug filed successfully'
  });
});

// GET /api/bugs/:id - Full details + relationships + flags + flow metrics + keywords + watchers
bugsRouter.get('/bugs/:id', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  if (isNaN(bugId)) return res.status(400).json({ error: 'Invalid bug ID' });

  if (!canUserViewBug(req.user, bugId)) {
    return res.status(404).json({ error: 'Bug not found or restricted' });
  }

  const bugRow = db.prepare(`
    SELECT
      bugs.*,
      c.name as component_name,
      u_reporter.id as rep_id, u_reporter.username as rep_username, u_reporter.name as rep_name, u_reporter.email as rep_email, u_reporter.role as rep_role, u_reporter.avatar_url as rep_avatar,
      u_assignee.id as ass_id, u_assignee.username as ass_username, u_assignee.name as ass_name, u_assignee.email as ass_email, u_assignee.role as ass_role, u_assignee.avatar_url as ass_avatar
    FROM bugs
    LEFT JOIN components c ON bugs.component_id = c.id
    LEFT JOIN users u_reporter ON bugs.reporter_id = u_reporter.id
    LEFT JOIN users u_assignee ON bugs.assignee_id = u_assignee.id
    WHERE bugs.id = ?
  `).get(bugId) as any;

  if (!bugRow) return res.status(404).json({ error: 'Bug not found' });

  // Fetch keywords
  const keywords = db.prepare(`
    SELECT k.* FROM bug_keywords bk
    JOIN keywords k ON bk.keyword_id = k.id
    WHERE bk.bug_id = ?
  `).all(bugId) as Keyword[];

  // Fetch watchers
  const watchers = db.prepare(`
    SELECT u.id, u.username, u.name, u.email, u.role, u.avatar_url
    FROM watchers w
    JOIN users u ON w.user_id = u.id
    WHERE w.bug_id = ?
  `).all(bugId) as User[];

  const currentUserId = req.user?.id;
  const is_watched = currentUserId ? watchers.some((w) => w.id === currentUserId) : false;

  const bug: Bug = {
    id: bugRow.id,
    title: bugRow.title,
    description: bugRow.description,
    status: bugRow.status,
    severity: bugRow.severity,
    priority: bugRow.priority,
    component_id: bugRow.component_id,
    component_name: bugRow.component_name || bugRow.component_id,
    reporter_id: bugRow.reporter_id,
    assignee_id: bugRow.assignee_id,
    resolution: bugRow.resolution,
    duplicate_of: bugRow.duplicate_of,
    security_group_id: bugRow.security_group_id,
    version: bugRow.version,
    target_milestone: bugRow.target_milestone,
    estimated_time: bugRow.estimated_time || 0,
    remaining_time: bugRow.remaining_time || 0,
    created_at: bugRow.created_at,
    updated_at: bugRow.updated_at,
    keywords,
    watchers,
    is_watched,
    reporter: bugRow.rep_id ? {
      id: bugRow.rep_id,
      username: bugRow.rep_username,
      name: bugRow.rep_name,
      email: bugRow.rep_email,
      role: bugRow.rep_role,
      avatar_url: bugRow.rep_avatar
    } : undefined,
    assignee: bugRow.ass_id ? {
      id: bugRow.ass_id,
      username: bugRow.ass_username,
      name: bugRow.ass_name,
      email: bugRow.ass_email,
      role: bugRow.ass_role,
      avatar_url: bugRow.ass_avatar
    } : null
  };

  // Fetch flags
  const flags = db.prepare(`
    SELECT
      f.*,
      ft.name as type_name, ft.target,
      u_setter.name as setter_name, u_setter.username as setter_username, u_setter.role as setter_role,
      u_req.name as req_name, u_req.username as req_username, u_req.role as req_role
    FROM flags f
    JOIN flag_types ft ON f.type_id = ft.id
    JOIN users u_setter ON f.setter_id = u_setter.id
    LEFT JOIN users u_req ON f.requestee_id = u_req.id
    WHERE f.bug_id = ?
    ORDER BY f.id DESC
  `).all(bugId).map((f: any) => ({
    id: f.id,
    type_id: f.type_id,
    type_name: f.type_name,
    bug_id: f.bug_id,
    attach_id: f.attach_id,
    status: f.status,
    setter_id: f.setter_id,
    requestee_id: f.requestee_id,
    created_at: f.created_at,
    resolved_at: f.resolved_at,
    setter: { id: f.setter_id, name: f.setter_name, username: f.setter_username, role: f.setter_role },
    requestee: f.requestee_id ? { id: f.requestee_id, name: f.req_name, username: f.req_username, role: f.req_role } : null
  })) as Flag[];

  // Fetch relationships
  const relationships = db.prepare(`
    SELECT
      r.*,
      b.title as target_bug_title,
      b.status as target_bug_status
    FROM relationships r
    JOIN bugs b ON r.to_bug_id = b.id
    WHERE r.from_bug_id = ?
    UNION ALL
    SELECT
      r.*,
      b.title as target_bug_title,
      b.status as target_bug_status
    FROM relationships r
    JOIN bugs b ON r.from_bug_id = b.id
    WHERE r.to_bug_id = ?
  `).all(bugId, bugId) as Relationship[];

  // Fetch git links
  const git_links = db.prepare(`
    SELECT * FROM git_links WHERE bug_id = ? ORDER BY id DESC
  `).all(bugId) as GitLink[];

  // Fetch comments (with work_time)
  const comments = db.prepare(`
    SELECT
      c.*,
      u.name as author_name, u.username as author_username, u.email as author_email, u.role as author_role, u.avatar_url as author_avatar
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.bug_id = ?
    ORDER BY c.id ASC
  `).all(bugId).map((c: any) => ({
    id: c.id,
    bug_id: c.bug_id,
    author_id: c.author_id,
    body: c.body,
    work_time: c.work_time || 0,
    is_private: !!c.is_private,
    created_at: c.created_at,
    author: { id: c.author_id, name: c.author_name, username: c.author_username, email: c.author_email || `${c.author_username}@triarc.dev`, role: c.author_role, avatar_url: c.author_avatar }
  })) as Comment[];

  // Fetch activity log
  const activity = db.prepare(`
    SELECT
      a.*,
      u.name as actor_name
    FROM activity a
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.bug_id = ?
    ORDER BY a.created_at DESC, a.id DESC
  `).all(bugId) as Activity[];

  // Compute flow metrics and stalled state
  const flow_metrics = deriveFlowMetrics(bug, activity, flags, git_links);
  const sla_status = computeSlaStatus(bug, flow_metrics);

  // Compute available transitions based on current user role
  const userRole = req.user?.role || 'developer';
  const available_transitions = getAvailableTransitions(defaultWorkflowConfig, bug.status, userRole);

  // Active viewers
  const viewers = sseService.getViewers(bugId);

  res.json({
    bug,
    flags,
    relationships,
    git_links,
    comments,
    activity,
    flow_metrics,
    sla_status,
    available_transitions,
    viewers
  });
});

// POST /api/bugs/:id/watch - Toggle/Add watcher
bugsRouter.post('/bugs/:id/watch', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  if (isNaN(bugId)) return res.status(400).json({ error: 'Invalid bug ID' });

  const userId = req.user?.id || 'u_alex';
  const nowIso = new Date().toISOString();

  try {
    db.prepare('INSERT INTO watchers (bug_id, user_id, created_at) VALUES (?, ?, ?)').run(bugId, userId, nowIso);
  } catch (err) {
    // Already watching
  }

  res.json({ success: true, is_watched: true });
});

// DELETE /api/bugs/:id/watch - Remove watcher
bugsRouter.delete('/bugs/:id/watch', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  if (isNaN(bugId)) return res.status(400).json({ error: 'Invalid bug ID' });

  const userId = req.user?.id || 'u_alex';
  db.prepare('DELETE FROM watchers WHERE bug_id = ? AND user_id = ?').run(bugId, userId);

  res.json({ success: true, is_watched: false });
});

// POST /api/bugs/:id/keywords - Add keyword to bug
bugsRouter.post('/bugs/:id/keywords', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  const { keyword_id } = req.body;

  if (isNaN(bugId) || !keyword_id) {
    return res.status(400).json({ error: 'bugId and keyword_id are required' });
  }

  try {
    db.prepare('INSERT INTO bug_keywords (bug_id, keyword_id) VALUES (?, ?)').run(bugId, keyword_id);
  } catch (err) {}

  res.json({ success: true });
});

// DELETE /api/bugs/:id/keywords/:keywordId - Remove keyword from bug
bugsRouter.delete('/bugs/:id/keywords/:keywordId', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  const { keywordId } = req.params;

  db.prepare('DELETE FROM bug_keywords WHERE bug_id = ? AND keyword_id = ?').run(bugId, keywordId);
  res.json({ success: true });
});

// PATCH /api/bugs/:id - Inline field update (Assignee, Priority, Severity, Component, Title, Milestone, Version, Estimated Time)
bugsRouter.patch('/bugs/:id', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  if (isNaN(bugId)) return res.status(400).json({ error: 'Invalid bug ID' });

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId) as Bug | undefined;
  if (!bug) return res.status(404).json({ error: 'Bug not found' });

  const { title, description, priority, severity, component_id, assignee_id, version, target_milestone, estimated_time, remaining_time } = req.body;
  const actorId = req.user ? req.user.id : null;
  const nowIso = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];
  const activityLogs: { field: string; old_value: string | null; new_value: string | null }[] = [];

  if (title !== undefined && title !== bug.title) {
    updates.push('title = ?');
    params.push(title);
    activityLogs.push({ field: 'title', old_value: bug.title, new_value: title });
  }

  if (description !== undefined && description !== bug.description) {
    updates.push('description = ?');
    params.push(description);
    activityLogs.push({ field: 'description', old_value: 'Previous description', new_value: 'Updated description' });
  }

  if (priority !== undefined && priority !== bug.priority) {
    updates.push('priority = ?');
    params.push(priority);
    activityLogs.push({ field: 'priority', old_value: bug.priority, new_value: priority });
  }

  if (severity !== undefined && severity !== bug.severity) {
    updates.push('severity = ?');
    params.push(severity);
    activityLogs.push({ field: 'severity', old_value: bug.severity, new_value: severity });
  }

  if (component_id !== undefined && component_id !== bug.component_id) {
    updates.push('component_id = ?');
    params.push(component_id);
    activityLogs.push({ field: 'component', old_value: bug.component_id, new_value: component_id });
  }

  if (version !== undefined && version !== bug.version) {
    updates.push('version = ?');
    params.push(version);
    activityLogs.push({ field: 'version', old_value: bug.version || 'None', new_value: version || 'None' });
  }

  if (target_milestone !== undefined && target_milestone !== bug.target_milestone) {
    updates.push('target_milestone = ?');
    params.push(target_milestone);
    activityLogs.push({ field: 'milestone', old_value: bug.target_milestone || 'None', new_value: target_milestone || 'None' });
  }

  if (estimated_time !== undefined && Number(estimated_time) !== bug.estimated_time) {
    updates.push('estimated_time = ?');
    params.push(Number(estimated_time));
    activityLogs.push({ field: 'estimated_time', old_value: `${bug.estimated_time || 0}h`, new_value: `${estimated_time}h` });
  }

  if (remaining_time !== undefined && Number(remaining_time) !== bug.remaining_time) {
    updates.push('remaining_time = ?');
    params.push(Number(remaining_time));
    activityLogs.push({ field: 'remaining_time', old_value: `${bug.remaining_time || 0}h`, new_value: `${remaining_time}h` });
  }

  if (assignee_id !== undefined && assignee_id !== bug.assignee_id) {
    updates.push('assignee_id = ?');
    params.push(assignee_id);
    const oldName = bug.assignee_id ? (db.prepare('SELECT name FROM users WHERE id = ?').get(bug.assignee_id) as any)?.name || bug.assignee_id : 'Unassigned';
    const newName = assignee_id ? (db.prepare('SELECT name FROM users WHERE id = ?').get(assignee_id) as any)?.name || assignee_id : 'Unassigned';
    activityLogs.push({ field: 'assignee', old_value: oldName, new_value: newName });
  }

  if (updates.length === 0) {
    return res.json({ success: true, message: 'No changes provided' });
  }

  updates.push('updated_at = ?');
  params.push(nowIso);
  params.push(bugId);

  db.prepare(`UPDATE bugs SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Record activity rows
  const insertAct = db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);
  for (const act of activityLogs) {
    insertAct.run(bugId, actorId, act.field, act.old_value, act.new_value, nowIso);
  }

  // Re-index embedding if title or description changed
  if (title !== undefined || description !== undefined) {
    indexBugEmbedding(bugId, title ?? bug.title, description ?? bug.description);
  }

  // Notify watchers
  notifyWatchers(bugId, actorId, 'status_change', `Bug #${bugId} updated: ${activityLogs.map((a) => a.field).join(', ')}`);

  // Broadcast live SSE
  sseService.broadcast('bug:updated', {
    bug_id: bugId,
    field: activityLogs.map((a) => a.field).join(', '),
    actor_id: actorId
  });

  res.json({
    success: true,
    bug_id: bugId,
    changes: activityLogs
  });
});

// POST /api/bugs/bulk-transition - Bulk status transitions individually validated by engine
bugsRouter.post('/bugs/bulk-transition', (req: AuthenticatedRequest, res: Response) => {
  const { bug_ids, toState, comment, fields } = req.body;
  if (!Array.isArray(bug_ids) || bug_ids.length === 0 || !toState) {
    return res.status(400).json({ error: 'bug_ids array and toState are required' });
  }

  const actorRole = req.user?.role || 'developer';
  const actorId = req.user?.id || null;
  const nowIso = new Date().toISOString();

  const results: BulkTransitionResult['results'] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const bugId of bug_ids) {
    const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId) as Bug | undefined;
    if (!bug) {
      results.push({ bug_id: bugId, success: false, reason: 'Bug not found' });
      failedCount++;
      continue;
    }

    const validation = validateTransition(defaultWorkflowConfig, bug.status, toState, actorRole, {
      comment,
      fields,
      actorId
    });

    if (!validation.valid) {
      results.push({
        bug_id: bugId,
        title: bug.title,
        old_status: bug.status,
        success: false,
        reason: validation.reason
      });
      failedCount++;
      continue;
    }

    const resolution = fields?.resolution || (toState === 'Resolved' ? 'FIXED' : bug.resolution);
    const duplicateOf = fields?.duplicate_of ? Number(fields.duplicate_of) : bug.duplicate_of;

    db.prepare(`
      UPDATE bugs
      SET status = ?, resolution = ?, duplicate_of = ?, updated_at = ?
      WHERE id = ?
    `).run(toState, resolution, duplicateOf, nowIso, bugId);

    db.prepare(`
      INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
      VALUES (?, ?, 'status', ?, ?, 0, ?)
    `).run(bugId, actorId, bug.status, toState, nowIso);

    if (comment && comment.trim()) {
      db.prepare(`
        INSERT INTO comments (bug_id, author_id, body, created_at)
        VALUES (?, ?, ?, ?)
      `).run(bugId, actorId || 'u_alex', comment.trim(), nowIso);
    }

    notifyWatchers(bugId, actorId, 'status_change', `Bug #${bugId} transitioned to ${toState}`);

    results.push({
      bug_id: bugId,
      title: bug.title,
      old_status: bug.status,
      new_status: toState,
      success: true
    });
    successCount++;

    sseService.broadcast('bug:updated', {
      bug_id: bugId,
      status: toState,
      resolution,
      actor_id: actorId,
      automated: false
    });
  }

  res.json({
    total: bug_ids.length,
    success_count: successCount,
    failed_count: failedCount,
    results
  });
});

// PATCH /api/bugs/:id/transition - Validated by Engine
bugsRouter.patch('/bugs/:id/transition', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  if (isNaN(bugId)) return res.status(400).json({ error: 'Invalid bug ID' });

  const { toState, comment, fields, automated = false } = req.body;
  if (!toState) return res.status(400).json({ error: 'toState is required' });

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId) as Bug | undefined;
  if (!bug) return res.status(404).json({ error: 'Bug not found' });

  const actorRole = req.user?.role || 'developer';
  const actorId = req.user?.id || null;

  // Validate with zero-I/O engine
  const validation = validateTransition(defaultWorkflowConfig, bug.status, toState, actorRole, {
    comment,
    fields,
    isAutomated: automated,
    actorId
  });

  if (!validation.valid) {
    return res.status(400).json({
      error: validation.reason,
      currentState: bug.status,
      targetState: toState
    });
  }

  const nowIso = new Date().toISOString();
  const resolution = fields?.resolution || (toState === 'Resolved' ? 'FIXED' : bug.resolution);
  const duplicateOf = fields?.duplicate_of ? Number(fields.duplicate_of) : bug.duplicate_of;

  // Update bug state in DB
  db.prepare(`
    UPDATE bugs
    SET status = ?, resolution = ?, duplicate_of = ?, updated_at = ?
    WHERE id = ?
  `).run(toState, resolution, duplicateOf, nowIso, bugId);

  // Write audit activity row
  const activityInsert = db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, 'status', ?, ?, ?, ?)
  `);
  const actResult = activityInsert.run(bugId, actorId, bug.status, toState, automated ? 1 : 0, nowIso);

  // If transition included comment, record it
  if (comment && comment.trim()) {
    db.prepare(`
      INSERT INTO comments (bug_id, author_id, body, created_at)
      VALUES (?, ?, ?, ?)
    `).run(bugId, actorId || 'u_alex', comment.trim(), nowIso);
  }

  // If transition to duplicate, record relationship
  if (toState === 'Duplicate' && duplicateOf) {
    try {
      db.prepare(`
        INSERT INTO relationships (from_bug_id, to_bug_id, type, created_at)
        VALUES (?, ?, 'DUPLICATE_OF', ?)
      `).run(bugId, duplicateOf, nowIso);
    } catch (e) {
      // Ignored if duplicate already linked
    }
  }

  // Notify watchers
  notifyWatchers(bugId, actorId, 'status_change', `Bug #${bugId} transitioned from ${bug.status} to ${toState}`);

  // Broadcast live SSE update
  sseService.broadcast('bug:updated', {
    bug_id: bugId,
    status: toState,
    resolution,
    actor_id: actorId,
    automated
  });

  res.json({
    success: true,
    bug_id: bugId,
    old_status: bug.status,
    new_status: toState,
    resolution,
    activity_id: actResult.lastInsertRowid
  });
});

// POST /api/bugs/:id/relate - Create relationship
bugsRouter.post('/bugs/:id/relate', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  const { toBugId, type } = req.body;

  if (isNaN(bugId) || !toBugId || !type) {
    return res.status(400).json({ error: 'bugId, toBugId, and type are required' });
  }

  const existing = db.prepare(`
    SELECT * FROM relationships WHERE from_bug_id = ? OR to_bug_id = ?
  `).all(bugId, bugId) as Relationship[];

  const validation = validateRelationship(bugId, Number(toBugId), type, existing);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  const nowIso = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO relationships (from_bug_id, to_bug_id, type, created_at)
    VALUES (?, ?, ?, ?)
  `).run(bugId, toBugId, type, nowIso);

  const actorId = req.user?.id || null;
  db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, 'relationship', NULL, ?, 0, ?)
  `).run(bugId, actorId, `${type} #${toBugId}`, nowIso);

  res.status(201).json({
    id: insert.lastInsertRowid,
    from_bug_id: bugId,
    to_bug_id: toBugId,
    type,
    created_at: nowIso
  });
});

// POST /api/bugs/:id/comments - Add comment with optional work_time logging
bugsRouter.post('/bugs/:id/comments', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  const { body, work_time = 0, is_private = false } = req.body;

  if (isNaN(bugId) || !body || !body.trim()) {
    return res.status(400).json({ error: 'Comment body is required' });
  }

  const authorId = req.user ? req.user.id : 'u_alex';
  const nowIso = new Date().toISOString();
  const parsedWorkTime = Number(work_time) || 0;

  const insert = db.prepare(`
    INSERT INTO comments (bug_id, author_id, body, work_time, is_private, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(bugId, authorId, body.trim(), parsedWorkTime, is_private ? 1 : 0, nowIso);

  // If work_time was logged, deduct from bug remaining_time
  if (parsedWorkTime > 0) {
    const bug = db.prepare('SELECT remaining_time FROM bugs WHERE id = ?').get(bugId) as { remaining_time: number } | undefined;
    if (bug) {
      const newRemaining = Math.max(0, (bug.remaining_time || 0) - parsedWorkTime);
      db.prepare('UPDATE bugs SET remaining_time = ? WHERE id = ?').run(newRemaining, bugId);

      db.prepare(`
        INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
        VALUES (?, ?, 'work_time', NULL, ?, 0, ?)
      `).run(bugId, authorId, `Logged ${parsedWorkTime}h work`, nowIso);
    }
  }

  db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, 'comment', NULL, 'New comment added', 0, ?)
  `).run(bugId, authorId, nowIso);

  notifyWatchers(bugId, authorId, 'comment_added', `New comment posted on Bug #${bugId}`);

  sseService.broadcast('activity:created', { bug_id: bugId, field: 'comment' });

  res.status(201).json({
    id: insert.lastInsertRowid,
    bug_id: bugId,
    body: body.trim(),
    work_time: parsedWorkTime,
    created_at: nowIso
  });
});

// GET /api/bugs/:id/duplicates - Live semantic similarity
bugsRouter.get('/bugs/:id/duplicates', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  if (isNaN(bugId)) return res.status(400).json({ error: 'Invalid bug ID' });

  const bug = db.prepare('SELECT title, description FROM bugs WHERE id = ?').get(bugId) as { title: string; description: string } | undefined;
  if (!bug) return res.status(404).json({ error: 'Bug not found' });

  const duplicates = findDuplicates(bug.title, bug.description, bugId, req.user);
  res.json({ duplicates });
});

// GET /api/bugs/:id/timeline - Unified activity + git events sorted in one lane
bugsRouter.get('/bugs/:id/timeline', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  if (isNaN(bugId)) return res.status(400).json({ error: 'Invalid bug ID' });

  const activities = db.prepare(`
    SELECT a.*, u.name as actor_name
    FROM activity a
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.bug_id = ?
    ORDER BY a.created_at ASC
  `).all(bugId) as (Activity & { actor_name?: string })[];

  const gitLinks = db.prepare(`
    SELECT * FROM git_links WHERE bug_id = ? ORDER BY updated_at ASC
  `).all(bugId) as GitLink[];

  const timelineItems: TimelineItem[] = [];

  for (const act of activities) {
    let title = `Changed ${act.field}`;
    if (act.field === 'status') {
      title = act.old_value ? `Status changed from ${act.old_value} to ${act.new_value}` : `Created as ${act.new_value}`;
    } else if (act.field === 'comment') {
      title = 'Comment added';
    } else if (act.field === 'work_time') {
      title = 'Work time logged';
    } else if (act.field === 'flag_resolved') {
      title = `Flag resolved to ${act.new_value}`;
    }

    timelineItems.push({
      id: `act_${act.id}`,
      timestamp: act.created_at,
      type: 'activity',
      title,
      description: act.new_value || undefined,
      actor_id: act.actor_id,
      actor_name: act.actor_name,
      automated: !!act.automated,
      meta: {
        field: act.field,
        old_value: act.old_value,
        new_value: act.new_value
      }
    });
  }

  for (const link of gitLinks) {
    timelineItems.push({
      id: `git_${link.id}`,
      timestamp: link.updated_at,
      type: 'git_event',
      title: `${link.kind}: ${link.ref}`,
      description: `State: ${link.state}`,
      automated: true,
      meta: {
        git_kind: link.kind,
        git_ref: link.ref,
        git_url: link.url,
        git_state: link.state
      }
    });
  }

  // Sort chronologically
  timelineItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json({ timeline: timelineItems });
});
