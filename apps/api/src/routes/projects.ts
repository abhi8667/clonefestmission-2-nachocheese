import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { getSecurityFilterSQL } from '../middleware/security.js';
import { Project, ProjectMember, ProjectAttentionSummary, UserRole } from '@triarc/shared-types';

export const projectsRouter = Router();

// Helper: resolve user's role on a specific project
export function getUserProjectRole(userId: string | undefined, projectId: string): UserRole | null {
  if (!userId) return null;
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: UserRole } | undefined;
  if (user?.role === 'admin') return 'admin'; // Global admin has admin privileges on all projects

  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId) as { role: UserRole } | undefined;
  return member?.role || null;
}

// GET /api/projects/attention - Attention strip summary counts
projectsRouter.get('/attention', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const security = getSecurityFilterSQL(req.user);

  if (!userId) {
    return res.json({
      assigned_to_me: 0,
      incoming_requests: 0,
      watching_changed: 0
    });
  }

  // 1. Bugs assigned to me (open)
  const assignedRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM bugs
    WHERE assignee_id = ?
      AND status NOT IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')
      AND ${security.sql}
  `).get(userId, ...security.params) as { count: number };

  // 2. Incoming flags/requests waiting on me (?)
  const requestsRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM flags f
    JOIN bugs ON f.bug_id = bugs.id
    WHERE f.requestee_id = ?
      AND f.status = '?'
      AND ${security.sql}
  `).get(userId, ...security.params) as { count: number };

  // 3. Watched bugs that were updated in the last 7 days
  const watchingRow = db.prepare(`
    SELECT COUNT(DISTINCT bugs.id) as count
    FROM watchers w
    JOIN bugs ON w.bug_id = bugs.id
    JOIN activity a ON a.bug_id = bugs.id
    WHERE w.user_id = ?
      AND a.created_at >= datetime('now', '-7 days')
      AND (a.actor_id IS NULL OR a.actor_id != ?)
      AND ${security.sql}
  `).get(userId, userId, ...security.params) as { count: number };

  res.json({
    assigned_to_me: assignedRow?.count || 0,
    incoming_requests: requestsRow?.count || 0,
    watching_changed: watchingRow?.count || 0
  } as ProjectAttentionSummary);
});

// GET /api/projects - List all projects accessible to current user
projectsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'admin';
  const security = getSecurityFilterSQL(req.user);

  let projectsQuery: string;
  let params: any[] = [];

  if (isAdmin || !userId) {
    // Admin or public demo: show all projects
    projectsQuery = `SELECT * FROM projects ORDER BY name ASC`;
  } else {
    // Show projects user is a member of (or default prj_core)
    projectsQuery = `
      SELECT DISTINCT p.*
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ? OR p.id = 'prj_core'
      ORDER BY p.name ASC
    `;
    params.push(userId);
  }

  const projects = db.prepare(projectsQuery).all(...params) as Project[];

  // Hydrate stats for each project
  const hydrated = projects.map((p) => {
    // Open bugs count
    const openRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM bugs
      WHERE project_id = ?
        AND status NOT IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')
        AND ${security.sql}
    `).get(p.id, ...security.params) as { count: number };

    // Assigned to me
    let assignedCount = 0;
    if (userId) {
      const assignedRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM bugs
        WHERE project_id = ?
          AND assignee_id = ?
          AND status NOT IN ('Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix')
          AND ${security.sql}
      `).get(p.id, userId, ...security.params) as { count: number };
      assignedCount = assignedRow?.count || 0;
    }

    // Stalled bugs count (Review? open > 24h while in review or quiet branches)
    const stalledRow = db.prepare(`
      SELECT COUNT(DISTINCT bugs.id) as count
      FROM bugs
      LEFT JOIN flags f ON f.bug_id = bugs.id AND f.status = '?' AND f.type_id = 'ft_review' AND f.created_at <= datetime('now', '-24 hours')
      WHERE bugs.project_id = ?
        AND bugs.status = 'In Review'
        AND f.id IS NOT NULL
        AND ${security.sql}
    `).get(p.id, ...security.params) as { count: number };

    const role = getUserProjectRole(userId, p.id) || (isAdmin ? 'admin' : 'developer');
    const stalledCount = stalledRow?.count || 0;

    return {
      ...p,
      open_bugs_count: openRow?.count || 0,
      assigned_to_me_count: assignedCount,
      stalled_bugs_count: stalledCount,
      user_role: role,
      health_status: stalledCount > 0 ? ('STALLED' as const) : ('HEALTHY' as const)
    };
  });

  res.json({ projects: hydrated });
});

// GET /api/projects/:key - Single project details with components & members
projectsRouter.get('/:key', (req: AuthenticatedRequest, res: Response) => {
  const key = String(req.params.key).toUpperCase();
  const userId = req.user?.id;

  const project = db.prepare(`
    SELECT * FROM projects WHERE UPPER(key) = ? OR id = ?
  `).get(key, req.params.key) as Project | undefined;

  if (!project) {
    return res.status(404).json({ error: `Project '${req.params.key}' not found` });
  }

  // Components for this project
  const components = db.prepare(`
    SELECT * FROM components WHERE project_id = ? OR project_id IS NULL ORDER BY name ASC
  `).all(project.id);

  // Members with user info
  const members = db.prepare(`
    SELECT pm.project_id, pm.user_id, pm.role, u.username, u.name, u.email, u.avatar_url
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY u.name ASC
  `).all(project.id).map((row: any) => ({
    project_id: row.project_id,
    user_id: row.user_id,
    role: row.role as UserRole,
    user: {
      id: row.user_id,
      username: row.username,
      name: row.name,
      email: row.email,
      avatar_url: row.avatar_url,
      role: row.role
    }
  }));

  const userRole = getUserProjectRole(userId, project.id) || (req.user?.role === 'admin' ? 'admin' : 'developer');

  res.json({
    project: {
      ...project,
      user_role: userRole
    },
    components,
    members
  });
});

// POST /api/projects - Create project (admin only)
projectsRouter.post('/', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { key, name, description, department_id, repo_url } = req.body;

  if (!key || !name) {
    return res.status(400).json({ error: 'Project key and name are required' });
  }

  const cleanKey = String(key).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,10}$/.test(cleanKey)) {
    return res.status(400).json({ error: 'Project key must be 2-10 alphanumeric characters (e.g. PAY, CORE)' });
  }

  const existing = db.prepare('SELECT id FROM projects WHERE UPPER(key) = ?').get(cleanKey);
  if (existing) {
    return res.status(409).json({ error: `Project key '${cleanKey}' already exists` });
  }

  const id = `prj_${cleanKey.toLowerCase()}_${Date.now().toString(36)}`;
  db.prepare(`
    INSERT INTO projects (id, key, name, description, department_id, repo_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, cleanKey, name, description || null, department_id || 'dept_eng', repo_url || null);

  // Add creator as project admin
  if (req.user?.id) {
    db.prepare(`
      INSERT OR REPLACE INTO project_members (project_id, user_id, role)
      VALUES (?, ?, 'admin')
    `).run(id, req.user.id);
  }

  const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
  res.status(201).json({ project: created });
});

// PATCH /api/projects/:key - Update project settings (project admin or system admin)
projectsRouter.patch('/:key', (req: AuthenticatedRequest, res: Response) => {
  const key = String(req.params.key).toUpperCase();
  const project = db.prepare('SELECT * FROM projects WHERE UPPER(key) = ? OR id = ?').get(key, req.params.key) as Project | undefined;

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Permission check
  const role = getUserProjectRole(req.user?.id, project.id);
  if (role !== 'admin' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Requires project admin or system admin privileges' });
  }

  const { name, description, repo_url } = req.body;
  db.prepare(`
    UPDATE projects
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        repo_url = COALESCE(?, repo_url)
    WHERE id = ?
  `).run(name !== undefined ? name : null, description !== undefined ? description : null, repo_url !== undefined ? repo_url : null, project.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id) as Project;
  res.json({ project: updated });
});

// POST /api/projects/:key/components - Add component to project
projectsRouter.post('/:key/components', (req: AuthenticatedRequest, res: Response) => {
  const key = String(req.params.key).toUpperCase();
  const project = db.prepare('SELECT * FROM projects WHERE UPPER(key) = ? OR id = ?').get(key, req.params.key) as Project | undefined;

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const role = getUserProjectRole(req.user?.id, project.id);
  if (role !== 'admin' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Requires project admin privileges' });
  }

  const { id, name, description } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Component ID and name are required' });
  }

  db.prepare(`
    INSERT INTO components (id, name, description, project_id)
    VALUES (?, ?, ?, ?)
  `).run(id, name, description || null, project.id);

  const component = db.prepare('SELECT * FROM components WHERE id = ?').get(id);
  res.status(201).json({ component });
});

// POST /api/projects/:key/members - Add or update member role
projectsRouter.post('/:key/members', (req: AuthenticatedRequest, res: Response) => {
  const key = String(req.params.key).toUpperCase();
  const project = db.prepare('SELECT * FROM projects WHERE UPPER(key) = ? OR id = ?').get(key, req.params.key) as Project | undefined;

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const role = getUserProjectRole(req.user?.id, project.id);
  if (role !== 'admin' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Requires project admin privileges' });
  }

  const { user_id, member_role } = req.body;
  if (!user_id || !member_role) {
    return res.status(400).json({ error: 'user_id and member_role are required' });
  }

  db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, ?)
    ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role
  `).run(project.id, user_id, member_role);

  res.json({ success: true, project_id: project.id, user_id, role: member_role });
});

// DELETE /api/projects/:key/members/:userId - Remove member
projectsRouter.delete('/:key/members/:userId', (req: AuthenticatedRequest, res: Response) => {
  const key = String(req.params.key).toUpperCase();
  const project = db.prepare('SELECT * FROM projects WHERE UPPER(key) = ? OR id = ?').get(key, req.params.key) as Project | undefined;

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const role = getUserProjectRole(req.user?.id, project.id);
  if (role !== 'admin' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Requires project admin privileges' });
  }

  db.prepare(`
    DELETE FROM project_members WHERE project_id = ? AND user_id = ?
  `).run(project.id, req.params.userId);

  res.json({ success: true, message: 'Member removed from project' });
});
