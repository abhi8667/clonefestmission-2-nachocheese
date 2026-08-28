import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/db/database.js';
import { runSeed } from '../src/scripts/seed.js';
import { findDuplicates } from '../src/services/duplicate-radar.js';
import { processGitHubEvent } from '../src/services/github-adapter.js';

describe('Triarc API Integration & Performance (§9 & §13)', () => {
  before(() => {
    runSeed();
  });

  it('Measures query latency (<150ms target at ~150 seeded bugs)', () => {
    const start = performance.now();
    const rows = db.prepare(`
      SELECT bugs.*, c.name as component_name, u.name as rep_name
      FROM bugs
      LEFT JOIN components c ON bugs.component_id = c.id
      LEFT JOIN users u ON bugs.reporter_id = u.id
      ORDER BY bugs.id DESC
      LIMIT 50
    `).all();
    const duration = performance.now() - start;

    assert.ok(rows.length > 0);
    assert.ok(duration < 150, `Query duration was ${duration.toFixed(2)}ms, expected < 150ms`);
  });

  it('Live Duplicate Radar returns high score on near-duplicate', () => {
    const matches = findDuplicates('Crash on save when offline with network disconnected');
    assert.ok(matches.length > 0);
    assert.equal(matches[0].bug_id, 412);
    assert.ok(matches[0].similarity_score >= 0.45, `Expected score >= 0.45, got ${matches[0].similarity_score}`);
  });

  it('GitHub Webhook commit automatically transitions bug #412 to Resolved with automated: 1', () => {
    const result = processGitHubEvent({
      kind: 'commit',
      commit_hash: 'abc1234',
      commit_message: 'Fixes #412: resolve offline save crash with fallback queue',
      author: 'alex'
    });

    assert.equal(result.success, true);
    const bug = db.prepare('SELECT status, resolution FROM bugs WHERE id = 412').get() as { status: string; resolution: string };
    assert.equal(bug.status, 'Resolved');
    assert.equal(bug.resolution, 'FIXED');

    const activity = db.prepare("SELECT * FROM activity WHERE bug_id = 412 AND field = 'status' ORDER BY id DESC LIMIT 1").get() as any;
    console.log('activity row returned:', activity);
    assert.equal(activity.new_value, 'Resolved');
    assert.ok(Number(activity.automated) === 1);
  });

  it('Queries Request Inbox (incoming, outgoing, resolved) without SQL errors', () => {
    const userId = 'u_alex';
    const queryFlags = (whereClause: string, params: any[], limit?: number) => {
      const limitClause = limit ? `LIMIT ${limit}` : '';
      return db.prepare(`
        SELECT
          f.*,
          ft.name as type_name, ft.target,
          b.title as bug_title, b.status as bug_status,
          u_setter.id as setter_id, u_setter.name as setter_name, u_setter.username as setter_username, u_setter.role as setter_role, u_setter.avatar_url as setter_avatar,
          u_req.id as req_id, u_req.name as req_name, u_req.username as req_username, u_req.role as req_role, u_req.avatar_url as req_avatar
        FROM flags f
        JOIN flag_types ft ON f.type_id = ft.id
        JOIN bugs b ON f.bug_id = b.id
        JOIN users u_setter ON f.setter_id = u_setter.id
        LEFT JOIN users u_req ON f.requestee_id = u_req.id
        WHERE ${whereClause}
        ORDER BY f.created_at DESC
        ${limitClause}
      `).all(...params);
    };

    const incoming = queryFlags('f.requestee_id = ? AND f.status = ?', [userId, '?']);
    const outgoing = queryFlags('f.setter_id = ? AND f.status = ?', [userId, '?']);
    const resolved = queryFlags('(f.requestee_id = ? OR f.setter_id = ?) AND f.status != ?', [userId, userId, '?'], 30);

    assert.ok(Array.isArray(incoming));
    assert.ok(Array.isArray(outgoing));
    assert.ok(Array.isArray(resolved));
  });
});
