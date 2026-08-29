import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { generateToken, isDemoModeEnabled, authMiddleware } from '../middleware/auth.js';
export const authRouter = Router();
function hydrateUserGroups(user) {
    const groups = db.prepare('SELECT group_id FROM user_group_map WHERE user_id = ?').all(user.id);
    user.security_group_ids = groups.map(g => g.group_id);
    return user;
}
// GET /api/users - List internal & active users (with security groups)
authRouter.get('/users', (req, res) => {
    const users = db.prepare(`
    SELECT id, username, name, email, role, avatar_url, is_external
    FROM users
    ORDER BY is_external ASC, name ASC
  `).all();
    const hydrated = users.map(u => hydrateUserGroups({
        ...u,
        is_external: Boolean(u.is_external)
    }));
    res.json({ users: hydrated });
});
// GET /api/auth/me - Validate token and return current profile
authRouter.get('/me', authMiddleware, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated', code: 'AUTH_REQUIRED' });
    }
    const userRow = db.prepare(`
    SELECT id, username, name, email, role, avatar_url, is_external
    FROM users
    WHERE id = ?
  `).get(req.user.id);
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
// POST /api/auth/login - Secure login with password verification
authRouter.post('/login', (req, res) => {
    const { username, password, userId } = req.body || {};
    if (!username && !userId) {
        return res.status(400).json({ error: 'Username or User ID is required', code: 'MISSING_CREDENTIALS' });
    }
    let userRow;
    if (userId) {
        userRow = db.prepare(`
      SELECT id, username, name, email, role, avatar_url, password_hash, is_external
      FROM users
      WHERE id = ?
    `).get(userId);
    }
    else if (username) {
        userRow = db.prepare(`
      SELECT id, username, name, email, role, avatar_url, password_hash, is_external
      FROM users
      WHERE username = ? OR email = ?
    `).get(username, username);
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
        const isValid = bcrypt.compareSync(password, userRow.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password', code: 'INVALID_CREDENTIALS' });
        }
    }
    else {
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
    let userRow;
    if (userId) {
        userRow = db.prepare('SELECT id, username, name, email, role, avatar_url, is_external FROM users WHERE id = ?').get(userId);
    }
    else if (username) {
        userRow = db.prepare('SELECT id, username, name, email, role, avatar_url, is_external FROM users WHERE username = ? OR email = ?').get(username, username);
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
//# sourceMappingURL=auth.js.map