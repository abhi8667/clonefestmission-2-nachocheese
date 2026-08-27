import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@triarc/shared-types';
import { db } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'triarc-dev-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check Authorization header or query param for SSE
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  // Header override for demo / testing convenience: 'x-user-id'
  const demoUserId = req.headers['x-user-id'] as string;
  if (demoUserId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(demoUserId) as User | undefined;
    if (user) {
      req.user = user;
      return next();
    }
  }

  if (!token) {
    // Default to first user (or admin) for easy local development/demo
    const defaultUser = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get() as User | undefined;
    if (defaultUser) {
      req.user = defaultUser;
      return next();
    }
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
    });
  };
}
