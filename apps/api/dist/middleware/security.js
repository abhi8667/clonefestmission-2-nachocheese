import { db } from '../db/database.js';
export function canUserViewBug(user, bugId) {
    const bug = db.prepare('SELECT security_group_id FROM bugs WHERE id = ?').get(bugId);
    if (!bug)
        return false;
    // If public bug (no security group), everyone can view
    if (!bug.security_group_id) {
        return true;
    }
    if (!user)
        return false;
    if (user.role === 'admin' || user.role === 'security')
        return true;
    // Check if user is in the security group
    const member = db.prepare('SELECT 1 FROM user_group_map WHERE user_id = ? AND group_id = ?').get(user.id, bug.security_group_id);
    return !!member;
}
export function getSecurityFilterSQL(user, tableAlias = 'bugs') {
    const col = `${tableAlias}.security_group_id`;
    if (!user) {
        return { sql: `${col} IS NULL`, params: [] };
    }
    if (user.role === 'admin' || user.role === 'security') {
        return { sql: '1=1', params: [] };
    }
    return {
        sql: `(${col} IS NULL OR ${col} IN (
      SELECT group_id FROM user_group_map WHERE user_id = ?
    ))`,
        params: [user.id]
    };
}
export function requireBugAccess(paramName = 'id') {
    return (req, res, next) => {
        const rawId = req.params[paramName];
        if (!rawId)
            return next();
        const idStr = String(rawId).includes('-') ? String(rawId).split('-').pop() : String(rawId);
        const bugId = parseInt(idStr, 10);
        if (isNaN(bugId)) {
            return res.status(400).json({ error: 'Invalid bug ID' });
        }
        if (!canUserViewBug(req.user, bugId)) {
            return res.status(404).json({ error: 'Bug not found or restricted' });
        }
        next();
    };
}
//# sourceMappingURL=security.js.map