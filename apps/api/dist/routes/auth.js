import { Router } from 'express';
import { db } from '../db/database.js';
import { generateToken } from '../middleware/auth.js';
export const authRouter = Router();
// GET /api/users
authRouter.get('/users', (req, res) => {
    const users = db.prepare('SELECT id, username, name, email, role, avatar_url FROM users').all();
    res.json({ users });
});
// GET /api/auth/me
authRouter.get('/me', (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = db.prepare('SELECT id, username, name, email, role, avatar_url FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const token = generateToken(user);
    res.json({ user, token });
});
// POST /api/auth/login
authRouter.post('/login', (req, res) => {
    const { username, userId } = req.body;
    let user;
    if (userId) {
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }
    else if (username) {
        user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const token = generateToken(user);
    res.json({ user, token });
});
//# sourceMappingURL=auth.js.map