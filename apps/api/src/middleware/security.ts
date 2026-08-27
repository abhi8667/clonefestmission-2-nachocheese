import { User } from '@triarc/shared-types';
import { db } from '../db/database.js';

export function canUserViewBug(user: User | undefined, bugId: number): boolean {
  const bug = db.prepare('SELECT security_group_id FROM bugs WHERE id = ?').get(bugId) as { security_group_id: string | null } | undefined;
  if (!bug) return false;

  // If public bug (no security group), everyone can view
  if (!bug.security_group_id) {
    return true;
  }

  if (!user) return false;
  if (user.role === 'admin' || user.role === 'security') return true;

  // Check if user is in the security group
  const member = db.prepare('SELECT 1 FROM user_group_map WHERE user_id = ? AND group_id = ?').get(user.id, bug.security_group_id);
  return !!member;
}

export function getSecurityFilterSQL(user: User | undefined): { sql: string; params: any[] } {
  if (!user) {
    return { sql: 'bugs.security_group_id IS NULL', params: [] };
  }

  if (user.role === 'admin' || user.role === 'security') {
    return { sql: '1=1', params: [] };
  }

  return {
    sql: `(bugs.security_group_id IS NULL OR bugs.security_group_id IN (
      SELECT group_id FROM user_group_map WHERE user_id = ?
    ))`,
    params: [user.id]
  };
}
