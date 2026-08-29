import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Notification } from '@triarc/shared-types';

export const notificationsRouter = Router();

// GET /api/notifications - List notifications for current user
notificationsRouter.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'u_alex';
  const unreadOnly = req.query.unread === 'true';

  const rows = db.prepare(`
    SELECT n.*, b.title as bug_title
    FROM notifications n
    LEFT JOIN bugs b ON n.bug_id = b.id
    WHERE n.user_id = ? ${unreadOnly ? 'AND n.read = 0' : ''}
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(userId) as Notification[];

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0
  `).get(userId) as { count: number };

  res.json({
    notifications: rows,
    unread_count: unreadCount.count
  });
});

// PATCH /api/notifications/:id/read - Mark single notification as read
notificationsRouter.patch('/notifications/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'u_alex';
  const { id } = req.params;

  db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?
  `).run(id, userId);

  res.json({ success: true, id: Number(id) });
});

// POST /api/notifications/read-all - Mark all notifications as read
notificationsRouter.post('/notifications/read-all', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'u_alex';

  db.prepare(`
    UPDATE notifications SET read = 1 WHERE user_id = ?
  `).run(userId);

  res.json({ success: true });
});
