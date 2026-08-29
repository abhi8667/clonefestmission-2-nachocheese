import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/database.js';
import { runSeed } from '../src/scripts/seed.js';
import { canUserViewBug, getSecurityFilterSQL } from '../src/middleware/security.js';
import { findDuplicates, indexBugEmbedding } from '../src/services/duplicate-radar.js';
import { generateToken } from '../src/middleware/auth.js';
import { User } from '@triarc/shared-types';

describe('Security & Row-Level Authorization (§7 & §10)', () => {
  before(() => {
    runSeed();
  });

  it('Generates valid signed JWT tokens for users', () => {
    const sarah = db.prepare("SELECT * FROM users WHERE id = 'u_sarah'").get() as User;
    const token = generateToken(sarah);
    assert.ok(typeof token === 'string' && token.length > 20);
  });

  it('Evaluates canUserViewBug correctly for security-grouped bugs', () => {
    const secMember = db.prepare("SELECT * FROM users WHERE id = 'u_sarah'").get() as User; // security group member
    const nonMember = db.prepare("SELECT * FROM users WHERE id = 'u_alex'").get() as User; // regular developer NOT in grp_sec

    // Insert a confidential security bug
    const res = db.prepare(`
      INSERT INTO bugs (title, description, status, severity, priority, component_id, reporter_id, security_group_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('Zero-day SSRF vulnerability in webhook listener', 'Critical flaw in HMAC parsing', 'Confirmed', 'blocker', 'highest', 'auth', 'u_sarah', 'grp_sec');

    const secBugId = Number(res.lastInsertRowid);
    indexBugEmbedding(secBugId, 'Zero-day SSRF vulnerability in webhook listener', 'Critical flaw in HMAC parsing');

    // User in security group (sarah or admin) CAN view
    assert.equal(canUserViewBug(secMember, secBugId), true);

    // Regular developer/reporter not in grp_sec CANNOT view
    assert.equal(canUserViewBug(nonMember, secBugId), false);

    // Anonymous/undefined user CANNOT view
    assert.equal(canUserViewBug(undefined, secBugId), false);
  });

  it('getSecurityFilterSQL correctly isolates database queries', () => {
    const secMember = db.prepare("SELECT * FROM users WHERE id = 'u_sarah'").get() as User;
    const nonMember = db.prepare("SELECT * FROM users WHERE id = 'u_alex'").get() as User;

    const secFilter = getSecurityFilterSQL(secMember);
    const nonSecFilter = getSecurityFilterSQL(nonMember);

    // Admin / Security role gets 1=1 (all bugs)
    assert.equal(secFilter.sql, '1=1');

    // Non-member gets parameterized group check
    assert.ok(nonSecFilter.sql.includes('bugs.security_group_id IS NULL OR bugs.security_group_id IN'));

    const visibleToSec = db.prepare(`SELECT COUNT(*) as count FROM bugs WHERE ${secFilter.sql}`).get(...secFilter.params) as { count: number };
    const visibleToNonSec = db.prepare(`SELECT COUNT(*) as count FROM bugs WHERE ${nonSecFilter.sql}`).get(...nonSecFilter.params) as { count: number };

    assert.ok(visibleToSec.count > visibleToNonSec.count, 'Security group member should see confidential bugs that non-member cannot');
  });

  it('Live Duplicate Radar STRICTLY prevents leaking confidential security bugs to non-members', () => {
    const secMember = db.prepare("SELECT * FROM users WHERE id = 'u_sarah'").get() as User;
    const nonMember = db.prepare("SELECT * FROM users WHERE id = 'u_alex'").get() as User;

    // Query with search term matching the confidential bug
    const matchesForSec = findDuplicates('Zero-day SSRF vulnerability in webhook listener', '', undefined, secMember);
    const matchesForNonSec = findDuplicates('Zero-day SSRF vulnerability in webhook listener', '', undefined, nonMember);

    const hasSecBugInSecResults = matchesForSec.some((m) => m.title.includes('SSRF'));
    const hasSecBugInNonSecResults = matchesForNonSec.some((m) => m.title.includes('SSRF'));

    assert.equal(hasSecBugInSecResults, true, 'Security group member should see confidential duplicate suggestions');
    assert.equal(hasSecBugInNonSecResults, false, 'Non-member MUST NOT see confidential security bug in duplicate radar');
  });
});
