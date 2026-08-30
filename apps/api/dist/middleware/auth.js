import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production mode.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'triarc-dev-secret-key-2026';
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
    console.warn('\x1b[33m⚠️  [SECURITY WARNING] Using default fallback JWT_SECRET. Set JWT_SECRET in production.\x1b[0m');
}
export function isDemoModeEnabled() {
    // Demo mode is strictly opt-in and NEVER allowed in production
    return process.env.TRIARC_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
}
// Log loud warning on boot when demo mode is active
if (isDemoModeEnabled() && process.env.NODE_ENV !== 'test') {
    console.warn('\x1b[33m⚠️  [AUTH WARNING] TRIARC_DEMO_MODE is active. Unauthenticated requests will fall back to admin, and x-user-id impersonation is enabled for demo walkthroughs.\x1b[0m');
}
export function generateToken(user) {
    // Ensure security groups are included in token payload
    let groupIds = user.security_group_ids;
    if (!groupIds && user.id) {
        try {
            const groups = db.prepare('SELECT group_id FROM user_group_map WHERE user_id = ?').all(user.id);
            groupIds = groups.map(g => g.group_id);
        }
        catch {
            groupIds = [];
        }
    }
    return jwt.sign({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        security_group_ids: groupIds || []
    }, JWT_SECRET, { expiresIn: '7d' });
}
export function authMiddleware(req, res, next) {
    // Header override for demo / testing convenience: 'x-user-id' (Strictly gated behind TRIARC_DEMO_MODE)
    if (isDemoModeEnabled()) {
        const demoUserId = req.headers['x-user-id'];
        if (demoUserId) {
            const user = db.prepare('SELECT id, username, name, email, role, avatar_url, is_external FROM users WHERE id = ? OR username = ?').get(demoUserId, demoUserId);
            if (user) {
                const groups = db.prepare('SELECT group_id FROM user_group_map WHERE user_id = ?').all(user.id);
                user.security_group_ids = groups.map(g => g.group_id);
                req.user = user;
                return next();
            }
        }
    }
    // Check Authorization header or query param for SSE
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    else if (req.query.token && typeof req.query.token === 'string') {
        token = req.query.token;
    }
    if (!token) {
        // Only fall back to admin user when TRIARC_DEMO_MODE is explicitly enabled
        if (isDemoModeEnabled()) {
            const defaultUser = db.prepare("SELECT id, username, name, email, role, avatar_url, is_external FROM users WHERE role = 'admin' LIMIT 1").get();
            if (defaultUser) {
                const groups = db.prepare('SELECT group_id FROM user_group_map WHERE user_id = ?').all(defaultUser.id);
                defaultUser.security_group_ids = groups.map(g => g.group_id);
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
        const decoded = jwt.verify(token, JWT_SECRET);
        // Finding 12: Validate decoded JWT structure
        if (!decoded || typeof decoded.id !== 'string' || typeof decoded.username !== 'string' || typeof decoded.role !== 'string') {
            return res.status(401).json({
                error: 'Malformed token payload',
                code: 'AUTH_MALFORMED_TOKEN'
            });
        }
        if (!decoded.security_group_ids && decoded.id) {
            const groups = db.prepare('SELECT group_id FROM user_group_map WHERE user_id = ?').all(decoded.id);
            decoded.security_group_ids = groups.map((g) => g.group_id);
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({
            error: 'Invalid or expired token',
            code: 'AUTH_INVALID_TOKEN'
        });
    }
}
export function requireRole(roles) {
    return (req, res, next) => {
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
//# sourceMappingURL=auth.js.map