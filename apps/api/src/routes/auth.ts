import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { User } from '@triarc/shared-types';
import { generateToken, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// GET /api/users
authRouter.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, username, name, email, role, avatar_url FROM users').all() as User[];
  res.json({ users });
});

// GET /api/auth/me
authRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db.prepare('SELECT id, username, name, email, role, avatar_url FROM users WHERE id = ?').get(req.user.id) as User | undefined;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const token = generateToken(user);
  res.json({ user, token });
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { username, userId } = req.body;

  let user: User | undefined;
  if (userId) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  } else if (username) {
    user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const token = generateToken(user);
  res.json({ user, token });
});
