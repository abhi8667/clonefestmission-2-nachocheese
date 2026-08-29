import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SavedSearch } from '@triarc/shared-types';

export const savedSearchesRouter = Router();

// GET /api/saved-searches - List saved searches for current user
savedSearchesRouter.get('/saved-searches', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'u_alex';
  const searches = db.prepare(`
    SELECT * FROM saved_searches
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as SavedSearch[];

  res.json({ saved_searches: searches });
});

// POST /api/saved-searches - Save a named search query
savedSearchesRouter.post('/saved-searches', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'u_alex';
  const { name, query } = req.body;

  if (!name || !query) {
    return res.status(400).json({ error: 'Name and query are required', code: 'VALIDATION_FAILED' });
  }

  const id = `ss_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO saved_searches (id, user_id, name, query, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, name.trim(), query.trim(), createdAt);

  const created = db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(id) as SavedSearch;
  res.status(201).json({ saved_search: created });
});

// DELETE /api/saved-searches/:id - Delete a saved search
savedSearchesRouter.delete('/saved-searches/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 'u_alex';
  const { id } = req.params;

  const result = db.prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?').run(id, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Saved search not found or access denied', code: 'NOT_FOUND' });
  }

  res.json({ success: true, deleted_id: id });
});
