import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { validateFlagCreation, validateFlagResolution } from '@triarc/engine';
import { Flag, FlagType } from '@triarc/shared-types';
import { sseService } from '../services/sse.js';

export const flagsRouter = Router();

// GET /api/flag-types
flagsRouter.get('/flag-types', (req, res) => {
  const types = db.prepare('SELECT * FROM flag_types').all() as FlagType[];
  res.json({ flag_types: types });
});

// GET /api/inbox - Personal Request Inbox (Incoming & Outgoing)
flagsRouter.get('/inbox', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user ? req.user.id : 'user_dev1';

  const queryFlags = (whereClause: string, params: any[], limit?: number) => {
    const limitClause = limit ? `LIMIT ${limit}` : '';
    return db.prepare(`
      SELECT
        f.*,
        ft.name as type_name, ft.target,
        b.title as bug_title, b.status as bug_status,
        u_setter.id as setter_id, u_setter.name as setter_name, u_setter.username as setter_username, u_setter.role as setter_role, u_setter.avatar_url as setter_avatar,
        u_req.id as req_id, u_req.name as req_name, u_req.username as req_username, u_req.role as req_role, u_req.avatar_url as req_avatar
      FROM flags f
      JOIN flag_types ft ON f.type_id = ft.id
      JOIN bugs b ON f.bug_id = b.id
      JOIN users u_setter ON f.setter_id = u_setter.id
      LEFT JOIN users u_req ON f.requestee_id = u_req.id
      WHERE ${whereClause}
      ORDER BY f.created_at DESC
      ${limitClause}
    `).all(...params).map((r: any) => ({
      id: r.id,
      type_id: r.type_id,
      type_name: r.type_name,
      bug_id: r.bug_id,
      bug_title: r.bug_title,
      bug_status: r.bug_status,
      attach_id: r.attach_id,
      status: r.status,
      setter_id: r.setter_id,
      requestee_id: r.requestee_id,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
      setter: {
        id: r.setter_id,
        name: r.setter_name,
        username: r.setter_username,
        role: r.setter_role,
        avatar_url: r.setter_avatar
      },
      requestee: r.req_id ? {
        id: r.req_id,
        name: r.req_name,
        username: r.req_username,
        role: r.req_role,
        avatar_url: r.req_avatar
      } : null
    }));
  };

  const incoming = queryFlags('f.requestee_id = ? AND f.status = ?', [userId, '?']);
  const outgoing = queryFlags('f.setter_id = ? AND f.status = ?', [userId, '?']);
  const resolved = queryFlags('(f.requestee_id = ? OR f.setter_id = ?) AND f.status != ?', [userId, userId, '?'], 30);

  res.json({
    incoming,
    outgoing,
    resolved,
    counts: {
      incoming: incoming.length,
      outgoing: outgoing.length
    }
  });
});

// POST /api/bugs/:id/flags - Create a request flag
flagsRouter.post('/bugs/:id/flags', (req: AuthenticatedRequest, res: Response) => {
  const bugId = parseInt(String(req.params.id), 10);
  const { type_id, requestee_id = null, attach_id = null } = req.body;

  if (isNaN(bugId) || !type_id) {
    return res.status(400).json({ error: 'bugId and type_id are required' });
  }

  const flagType = db.prepare('SELECT * FROM flag_types WHERE id = ?').get(type_id) as FlagType | undefined;
  if (!flagType) {
    return res.status(404).json({ error: `Flag type '${type_id}' not found` });
  }

  const setterId = req.user ? req.user.id : 'user_dev1';
  const setterRole = req.user ? req.user.role : 'developer';

  const validation = validateFlagCreation(flagType, setterRole, setterId, requestee_id);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  const nowIso = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO flags (type_id, bug_id, attach_id, status, setter_id, requestee_id, created_at)
    VALUES (?, ?, ?, '?', ?, ?, ?)
  `).run(type_id, bugId, attach_id, setterId, requestee_id, nowIso);

  const flagId = Number(insert.lastInsertRowid);

  // Record activity
  const reqTarget = requestee_id ? ` for @${requestee_id}` : '';
  db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, 'flag_created', NULL, ?, 0, ?)
  `).run(bugId, setterId, `Requested ${flagType.name}${reqTarget}`, nowIso);

  sseService.broadcast('flag:created', {
    flag_id: flagId,
    bug_id: bugId,
    type_name: flagType.name,
    setter_id: setterId,
    requestee_id
  });

  res.status(201).json({
    id: flagId,
    type_id,
    bug_id: bugId,
    status: '?',
    setter_id: setterId,
    requestee_id,
    created_at: nowIso
  });
});

// PATCH /api/flags/:id or POST /api/flags/:id/resolve - One-click resolution (+/-)
const resolveHandler = (req: AuthenticatedRequest, res: Response) => {
  const flagId = parseInt(String(req.params.id), 10);
  const { status, comment } = req.body;

  if (isNaN(flagId) || !status) {
    return res.status(400).json({ error: 'flagId and status (+ or -) are required' });
  }

  const flag = db.prepare('SELECT * FROM flags WHERE id = ?').get(flagId) as Flag | undefined;
  if (!flag) {
    return res.status(404).json({ error: 'Flag not found' });
  }

  const flagType = db.prepare('SELECT * FROM flag_types WHERE id = ?').get(flag.type_id) as FlagType | undefined;
  if (!flagType) {
    return res.status(404).json({ error: 'Flag type not found' });
  }

  const actorId = req.user ? req.user.id : 'user_dev2';
  const actorRole = req.user ? req.user.role : 'developer';

  const validation = validateFlagResolution(flag, flagType, actorId, actorRole, status);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE flags
    SET status = ?, resolved_at = ?
    WHERE id = ?
  `).run(status, nowIso, flagId);

  // Record resolution in activity
  const resolutionText = status === '+' ? `Approved / Granted (+)` : `Rejected / Changes Requested (-)`;
  db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, 'flag_resolved', '?', ?, 0, ?)
  `).run(flag.bug_id, actorId, `${flagType.name} -> ${status}: ${resolutionText}`, nowIso);

  if (comment && comment.trim()) {
    db.prepare(`
      INSERT INTO comments (bug_id, author_id, body, created_at)
      VALUES (?, ?, ?, ?)
    `).run(flag.bug_id, actorId, `[Flag ${flagType.name} ${status}] ${comment.trim()}`, nowIso);
  }

  sseService.broadcast('flag:resolved', {
    flag_id: flagId,
    bug_id: flag.bug_id,
    type_name: flagType.name,
    status,
    actor_id: actorId
  });

  res.json({
    success: true,
    flag_id: flagId,
    bug_id: flag.bug_id,
    status,
    resolved_at: nowIso
  });
};

flagsRouter.patch('/flags/:id', resolveHandler);
flagsRouter.post('/flags/:id/resolve', resolveHandler);
