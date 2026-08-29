import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { User, Component, Milestone, Version, FlagType } from '@triarc/shared-types';
import { workflowConfig } from '@triarc/engine';
import { sseService } from '../services/sse.js';

export const adminRouter = Router();

// Protect ALL admin routes with requireRole(['admin'])
adminRouter.use(requireRole(['admin']));

// GET /api/admin/users - List users with security group memberships
adminRouter.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const users = db.prepare(`
    SELECT id, username, name, email, role, avatar_url, is_external
    FROM users
    ORDER BY is_external ASC, name ASC
  `).all() as (User & { is_external?: number })[];

  const userGroups = db.prepare('SELECT user_id, group_id FROM user_group_map').all() as { user_id: string; group_id: string }[];
  const groupMap = new Map<string, string[]>();
  for (const ug of userGroups) {
    if (!groupMap.has(ug.user_id)) groupMap.set(ug.user_id, []);
    groupMap.get(ug.user_id)!.push(ug.group_id);
  }

  const result = users.map(u => ({
    ...u,
    is_external: Boolean(u.is_external),
    security_group_ids: groupMap.get(u.id) || []
  }));

  const allGroups = db.prepare('SELECT * FROM groups').all();

  res.json({ users: result, groups: allGroups });
});

// POST /api/admin/users - Create new internal user
adminRouter.post('/users', (req: AuthenticatedRequest, res: Response) => {
  const { id, username, name, email, role, password = 'password123', security_group_ids = [] } = req.body || {};

  if (!username || !name || !email || !role) {
    return res.status(400).json({ error: 'Username, name, email, and role are required', code: 'INVALID_INPUT' });
  }

  const userId = id || `u_${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarUrl = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100`;

  try {
    db.prepare(`
      INSERT INTO users (id, username, name, email, role, avatar_url, password_hash, is_external)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(userId, username, name, email, role, avatarUrl, passwordHash);

    // Assign security groups
    if (Array.isArray(security_group_ids)) {
      const insertMap = db.prepare('INSERT OR IGNORE INTO user_group_map (user_id, group_id) VALUES (?, ?)');
      for (const gid of security_group_ids) {
        insertMap.run(userId, gid);
      }
    }

    res.status(201).json({
      user: {
        id: userId,
        username,
        name,
        email,
        role,
        avatar_url: avatarUrl,
        security_group_ids,
        is_external: false
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create user', code: 'CREATE_USER_ERROR' });
  }
});

// PATCH /api/admin/users/:id - Update user role and security groups
adminRouter.patch('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  const { role, security_group_ids, is_external } = req.body || {};

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  }

  if (is_external !== undefined) {
    db.prepare('UPDATE users SET is_external = ? WHERE id = ?').run(is_external ? 1 : 0, userId);
  }

  if (Array.isArray(security_group_ids)) {
    db.prepare('DELETE FROM user_group_map WHERE user_id = ?').run(userId);
    const insertMap = db.prepare('INSERT INTO user_group_map (user_id, group_id) VALUES (?, ?)');
    for (const gid of security_group_ids) {
      insertMap.run(userId, gid);
    }
  }

  const updatedUser = db.prepare('SELECT id, username, name, email, role, avatar_url, is_external FROM users WHERE id = ?').get(userId) as any;
  const currentGroups = db.prepare('SELECT group_id FROM user_group_map WHERE user_id = ?').all(userId) as { group_id: string }[];

  sseService.broadcast('admin:user_updated', { userId, role, security_group_ids });

  res.json({
    user: {
      ...updatedUser,
      is_external: Boolean(updatedUser.is_external),
      security_group_ids: currentGroups.map(g => g.group_id)
    }
  });
});

// GET /api/admin/components
adminRouter.get('/components', (req: AuthenticatedRequest, res: Response) => {
  const components = db.prepare('SELECT * FROM components ORDER BY name ASC').all();
  res.json({ components });
});

// POST /api/admin/components
adminRouter.post('/components', (req: AuthenticatedRequest, res: Response) => {
  const { id, name, description } = req.body || {};
  if (!id || !name) {
    return res.status(400).json({ error: 'Component ID and name are required', code: 'INVALID_INPUT' });
  }

  try {
    db.prepare('INSERT INTO components (id, name, description) VALUES (?, ?, ?)').run(id, name, description || '');
    res.status(201).json({ component: { id, name, description } });
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: 'CREATE_COMPONENT_ERROR' });
  }
});

// DELETE /api/admin/components/:id
adminRouter.delete('/components/:id', (req: AuthenticatedRequest, res: Response) => {
  const compId = req.params.id;
  db.prepare('DELETE FROM components WHERE id = ?').run(compId);
  res.json({ success: true, id: compId });
});

// GET /api/admin/milestones
adminRouter.get('/milestones', (req: AuthenticatedRequest, res: Response) => {
  const milestones = db.prepare('SELECT * FROM milestones ORDER BY name ASC').all();
  res.json({ milestones });
});

// POST /api/admin/milestones
adminRouter.post('/milestones', (req: AuthenticatedRequest, res: Response) => {
  const { id, name, due_date, product_id = 'triarc' } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'Milestone name is required', code: 'INVALID_INPUT' });
  }

  const msId = id || `ms_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  try {
    db.prepare('INSERT INTO milestones (id, product_id, name, due_date) VALUES (?, ?, ?, ?)').run(msId, product_id, name, due_date || null);
    res.status(201).json({ milestone: { id: msId, product_id, name, due_date } });
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: 'CREATE_MILESTONE_ERROR' });
  }
});

// DELETE /api/admin/milestones/:id
adminRouter.delete('/milestones/:id', (req: AuthenticatedRequest, res: Response) => {
  const msId = req.params.id;
  db.prepare('DELETE FROM milestones WHERE id = ?').run(msId);
  res.json({ success: true, id: msId });
});

// GET /api/admin/versions
adminRouter.get('/versions', (req: AuthenticatedRequest, res: Response) => {
  const versions = db.prepare('SELECT * FROM versions ORDER BY name ASC').all();
  res.json({ versions });
});

// POST /api/admin/versions
adminRouter.post('/versions', (req: AuthenticatedRequest, res: Response) => {
  const { id, name, product_id = 'triarc' } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'Version name is required', code: 'INVALID_INPUT' });
  }

  const verId = id || `ver_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  try {
    db.prepare('INSERT INTO versions (id, product_id, name) VALUES (?, ?, ?)').run(verId, product_id, name);
    res.status(201).json({ version: { id: verId, product_id, name } });
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: 'CREATE_VERSION_ERROR' });
  }
});

// DELETE /api/admin/versions/:id
adminRouter.delete('/versions/:id', (req: AuthenticatedRequest, res: Response) => {
  const verId = req.params.id;
  db.prepare('DELETE FROM versions WHERE id = ?').run(verId);
  res.json({ success: true, id: verId });
});

// GET /api/admin/flag-types
adminRouter.get('/flag-types', (req: AuthenticatedRequest, res: Response) => {
  const flagTypes = db.prepare('SELECT * FROM flag_types').all();
  res.json({ flag_types: flagTypes });
});

// POST /api/admin/flag-types
adminRouter.post('/flag-types', (req: AuthenticatedRequest, res: Response) => {
  const { id, name, target, is_requestable = 1, is_requesteeble = 1, grant_role, request_role } = req.body || {};
  if (!id || !name || !grant_role || !request_role) {
    return res.status(400).json({ error: 'id, name, grant_role, and request_role are required', code: 'INVALID_INPUT' });
  }

  try {
    db.prepare(`
      INSERT OR REPLACE INTO flag_types (id, name, target, is_requestable, is_requesteeble, grant_role, request_role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, target || 'bug', is_requestable ? 1 : 0, is_requesteeble ? 1 : 0, grant_role, request_role);
    res.json({ success: true, flag_type: { id, name, target, is_requestable, is_requesteeble, grant_role, request_role } });
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: 'SAVE_FLAG_TYPE_ERROR' });
  }
});

// GET /api/admin/workflow - Fetch active state transitions
adminRouter.get('/workflow', (req: AuthenticatedRequest, res: Response) => {
  res.json({ workflow: workflowConfig });
});
