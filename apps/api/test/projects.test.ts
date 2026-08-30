process.env.NODE_ENV = 'test';
process.env.TRIARC_DEMO_MODE = 'true';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { runSeed } from '../src/scripts/seed.js';
import type { Server } from 'node:http';

describe('Project-Scoped Navigation & Management API', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    runSeed();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/projects lists projects with hydrated bug counts and member role', async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      headers: { 'x-user-id': 'u_alex' }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.projects));
    assert.ok(body.projects.length >= 3);

    const core = body.projects.find((p: any) => p.key === 'CORE');
    assert.ok(core);
    assert.strictEqual(core.user_role, 'developer');
    assert.ok(typeof core.open_bugs_count === 'number');
    assert.ok(typeof core.assigned_to_me_count === 'number');
    assert.ok(core.health_status === 'HEALTHY' || core.health_status === 'STALLED');
  });

  it('GET /api/projects/attention returns attention counts', async () => {
    const res = await fetch(`${baseUrl}/api/projects/attention`, {
      headers: { 'x-user-id': 'u_alex' }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(typeof body.assigned_to_me === 'number');
    assert.ok(typeof body.incoming_requests === 'number');
    assert.ok(typeof body.watching_changed === 'number');
  });

  it('GET /api/projects/:key returns project details, components, and members', async () => {
    const res = await fetch(`${baseUrl}/api/projects/CORE`, {
      headers: { 'x-user-id': 'u_alex' }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.project);
    assert.strictEqual(body.project.key, 'CORE');
    assert.strictEqual(body.project.user_role, 'developer');
    assert.ok(Array.isArray(body.components));
    assert.ok(Array.isArray(body.members));
    assert.ok(body.members.some((m: any) => m.user_id === 'u_alex'));
  });

  it('GET /api/bugs?project=PAY filters bugs scoped to project and returns project_key', async () => {
    const res = await fetch(`${baseUrl}/api/bugs?project=PAY`, {
      headers: { 'x-user-id': 'u_alex' }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.bugs));
    for (const bug of body.bugs) {
      assert.strictEqual(bug.project_key, 'PAY');
    }
  });

  it('GET /api/bugs/:id accepts both numeric ID and project issue ref CORE-412', async () => {
    const resNumeric = await fetch(`${baseUrl}/api/bugs/412`, {
      headers: { 'x-user-id': 'u_alex' }
    });
    assert.strictEqual(resNumeric.status, 200);
    const bodyNum = await resNumeric.json();
    assert.strictEqual(bodyNum.bug.id, 412);
    assert.strictEqual(bodyNum.bug.project_key, 'CORE');

    const resRef = await fetch(`${baseUrl}/api/bugs/CORE-412`, {
      headers: { 'x-user-id': 'u_alex' }
    });
    assert.strictEqual(resRef.status, 200);
    const bodyRef = await resRef.json();
    assert.strictEqual(bodyRef.bug.id, 412);
    assert.strictEqual(bodyRef.bug.title, 'Crash on save when offline');
  });

  it('POST /api/projects creates a new project when authorized as admin', async () => {
    const testKey = `T${Date.now().toString().slice(-4)}`;
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'u_marcus'
      },
      body: JSON.stringify({
        key: testKey,
        name: 'Telemetry Test Workspace',
        description: 'Automated test project'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.project.key, testKey);
  });

  it('PATCH /api/projects/:key updates project settings', async () => {
    const res = await fetch(`${baseUrl}/api/projects/CORE`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'u_marcus'
      },
      body: JSON.stringify({
        description: 'Updated core platform description for testing'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.project.description, 'Updated core platform description for testing');
  });

  it('POST /api/projects/from-github creates workspace from GitHub repo and ingests telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/projects/from-github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'u_alex'
      },
      body: JSON.stringify({
        repoUrl: 'https://github.com/facebook/react',
        key: 'REACT',
        name: 'React Framework Workspace',
        useFixture: true,
        fixtureName: 'facebook/react'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.project.key, 'REACT');
    assert.ok(body.import.total_issues > 0);
  });

  it('GET /api/projects/:key/git-telemetry returns commits, collaborators, and branches', async () => {
    const res = await fetch(`${baseUrl}/api/projects/REACT/git-telemetry`, {
      headers: { 'x-user-id': 'u_alex' }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.commits));
    assert.ok(Array.isArray(body.collaborators));
    assert.ok(Array.isArray(body.branches));
    assert.ok(body.stats.total_commits >= 1);
    assert.ok(body.stats.total_collaborators >= 1);
  });

  it('POST /api/projects/:key/simulate-commit simulates a collaborator commit and returns event', async () => {
    const res = await fetch(`${baseUrl}/api/projects/REACT/simulate-commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'u_alex'
      },
      body: JSON.stringify({
        author: 'alex',
        message: 'fix: resolve concurrent scheduler race condition',
        branch: 'fix/scheduler-race'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.commit.author_username, 'alex');
    assert.strictEqual(body.commit.branch, 'fix/scheduler-race');
  });
});

