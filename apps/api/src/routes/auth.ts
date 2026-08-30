import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { User } from '@triarc/shared-types';
import { generateToken, AuthenticatedRequest, isDemoModeEnabled, authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

function hydrateUserGroups(user: User): User {
  const groups = db.prepare('SELECT group_id FROM user_group_map WHERE user_id = ?').all(user.id) as { group_id: string }[];
  user.security_group_ids = groups.map(g => g.group_id);
  return user;
}

// GET /api/users - List internal & active users (with security groups)
authRouter.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, name, email, role, avatar_url, is_external
    FROM users
    ORDER BY is_external ASC, name ASC
  `).all() as (User & { is_external?: number })[];

  const hydrated = users.map(u => hydrateUserGroups({
    ...u,
    is_external: Boolean(u.is_external)
  }));

  res.json({ users: hydrated });
});

// GET /api/auth/me - Validate token and return current profile
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated', code: 'AUTH_REQUIRED' });
  }

  const userRow = db.prepare(`
    SELECT id, username, name, email, role, avatar_url, is_external
    FROM users
    WHERE id = ?
  `).get(req.user.id) as (User & { is_external?: number }) | undefined;

  if (!userRow) {
    return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  const user = hydrateUserGroups({
    ...userRow,
    is_external: Boolean(userRow.is_external)
  });

  const token = generateToken(user);
  res.json({ user, token });
});

// POST /api/auth/register - Self-service account registration (Finding 07)
authRouter.post('/register', async (req, res) => {
  const { username, name, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({
      error: 'Username, email, and password are required',
      code: 'MISSING_FIELDS'
    });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanUsername.length < 2 || cleanUsername.length > 32) {
    return res.status(400).json({ error: 'Username must be between 2 and 32 characters', code: 'INVALID_USERNAME' });
  }

  // Check for existing username or email
  const existing = db.prepare('SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ?').get(cleanUsername, cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already in use', code: 'USER_EXISTS' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const userId = `usr_${cleanUsername.replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;
  const displayName = name ? String(name).trim() : username;
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
  // Role is strictly 'reporter' by default; caller-supplied role is never accepted
  db.prepare(`
    INSERT INTO users (id, username, name, email, role, avatar_url, password_hash, is_external)
    VALUES (?, ?, ?, ?, 'reporter', ?, ?, 0)
  `).run(userId, cleanUsername, displayName, cleanEmail, avatarUrl, password_hash);

  const newUser: User = {
    id: userId,
    username: cleanUsername,
    name: displayName,
    email: cleanEmail,
    role: 'reporter',
    avatar_url: avatarUrl,
    security_group_ids: []
  };

  const token = generateToken(newUser);
  res.status(201).json({ user: newUser, token });
});

// POST /api/auth/login - Secure login with password verification (Finding 11: non-blocking async)
authRouter.post('/login', async (req, res) => {
  const { username, password, userId } = req.body || {};

  if (!username && !userId) {
    return res.status(400).json({ error: 'Username or User ID is required', code: 'MISSING_CREDENTIALS' });
  }

  let userRow: (User & { password_hash?: string; is_external?: number }) | undefined;

  if (userId) {
    userRow = db.prepare(`
      SELECT id, username, name, email, role, avatar_url, password_hash, is_external
      FROM users
      WHERE id = ?
    `).get(userId) as any;
  } else if (username) {
    userRow = db.prepare(`
      SELECT id, username, name, email, role, avatar_url, password_hash, is_external
      FROM users
      WHERE lower(username) = lower(?) OR lower(email) = lower(?)
    `).get(username, username) as any;
  }

  if (!userRow) {
    return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  // External GitHub accounts cannot log in directly
  if (userRow.is_external) {
    return res.status(403).json({
      error: 'External GitHub users cannot authenticate directly. Please log in using an internal organization account.',
      code: 'EXTERNAL_USER_FORBIDDEN'
    });
  }

  // Password verification
  if (password) {
    if (!userRow.password_hash) {
      return res.status(401).json({ error: 'Account has no password configured', code: 'AUTH_FAILED' });
    }
    const isValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password', code: 'INVALID_CREDENTIALS' });
    }
  } else {
    // If no password provided, only allow in demo mode
    if (!isDemoModeEnabled()) {
      return res.status(401).json({ error: 'Password is required', code: 'PASSWORD_REQUIRED' });
    }
  }

  const { password_hash, ...safeUser } = userRow;
  const user = hydrateUserGroups({
    ...safeUser,
    is_external: false
  });

  const token = generateToken(user);
  res.json({ user, token });
});

// POST /api/auth/quick-login - 1-Click Demo Switcher
authRouter.post('/quick-login', (req, res) => {
  const { userId, username } = req.body || {};

  if (!isDemoModeEnabled()) {
    return res.status(403).json({ error: 'Quick login is only available in demo mode', code: 'DEMO_MODE_ONLY' });
  }

  let userRow: User | undefined;
  if (userId) {
    userRow = db.prepare('SELECT id, username, name, email, role, avatar_url, is_external FROM users WHERE id = ?').get(userId) as any;
  } else if (username) {
    userRow = db.prepare('SELECT id, username, name, email, role, avatar_url, is_external FROM users WHERE username = ? OR email = ?').get(username, username) as any;
  }

  if (!userRow) {
    return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  const user = hydrateUserGroups({
    ...userRow,
    is_external: Boolean(userRow.is_external)
  });

  const token = generateToken(user);
  res.json({ user, token });
});
