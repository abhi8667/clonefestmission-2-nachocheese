import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@triarc/shared-types';
import { db } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'triarc-dev-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function isDemoModeEnabled(): boolean {
  return process.env.TRIARC_DEMO_MODE !== 'false';
}

// Log loud warning on boot when demo mode is active
if (isDemoModeEnabled() && process.env.NODE_ENV !== 'test') {
  console.warn(
    '\x1b[33m⚠️  [AUTH WARNING] TRIARC_DEMO_MODE is active. Unauthenticated requests will fall back to admin, and x-user-id impersonation is enabled for demo walkthroughs.\x1b[0m'
  );
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
  // Header override for demo / testing convenience: 'x-user-id' (Strictly gated behind TRIARC_DEMO_MODE)
  if (isDemoModeEnabled()) {
    const demoUserId = req.headers['x-user-id'] as string;
    if (demoUserId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ? OR username = ?').get(demoUserId, demoUserId) as User | undefined;
      if (user) {
        req.user = user;
        return next();
      }
    }
  }

  // Check Authorization header or query param for SSE
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    // Only fall back to admin user when TRIARC_DEMO_MODE is explicitly enabled
    if (isDemoModeEnabled()) {
      const defaultUser = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get() as User | undefined;
      if (defaultUser) {
        req.user = defaultUser;
        return next();
      }
    }
    return res.status(401).json({
      error: 'Authentication token required',
      code: 'AUTH_REQUIRED',
      details: 'Provide a valid Bearer JWT token in Authorization header, or enable TRIARC_DEMO_MODE=true for local evaluation.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'AUTH_INVALID_TOKEN'
    });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      code: 'FORBIDDEN_ROLE'
    });
  };
}
