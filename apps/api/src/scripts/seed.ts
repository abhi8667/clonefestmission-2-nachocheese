import { db } from '../db/database.js';
import { initializeDatabase } from '../db/schema.js';
import { indexBugEmbedding } from '../services/duplicate-radar.js';

export function runSeed() {
  console.log('🌱 Starting Triarc database seeding...');

  initializeDatabase();

  // Clean existing data for clean seed
  db.exec(`
    DELETE FROM bug_embeddings;
    DELETE FROM comments;
    DELETE FROM attachments;
    DELETE FROM git_links;
    DELETE FROM flags;
    DELETE FROM relationships;
    DELETE FROM activity;
    DELETE FROM bug_group_map;
    DELETE FROM user_group_map;
    DELETE FROM bugs;
    DELETE FROM groups;
    DELETE FROM users;
  `);

  console.log('  Cleaned tables. Seeding users and groups...');

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, name, email, role, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('u_alex', 'alex', 'Alex River', 'alex@triarc.dev', 'developer', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100');
  insertUser.run('u_sam', 'sam', 'Sam Patel', 'sam@triarc.dev', 'developer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100');
  insertUser.run('u_priya', 'priya', 'Priya Sharma', 'priya@triarc.dev', 'triager', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100');
  insertUser.run('u_marcus', 'marcus', 'Marcus Vance', 'marcus@triarc.dev', 'admin', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100');
  insertUser.run('u_sarah', 'sarah', 'Sarah Connor', 'sarah@triarc.dev', 'security', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100');
  insertUser.run('u_chen', 'chen', 'Chen Wei', 'chen@triarc.dev', 'reporter', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100');

  // 2. Seed Groups
  const insertGroup = db.prepare('INSERT INTO groups (id, name, description) VALUES (?, ?, ?)');
  insertGroup.run('grp_sec', 'Security Core Team', 'Confidential vulnerability reports and cryptographic secrets');

  const insertUserGroup = db.prepare('INSERT INTO user_group_map (user_id, group_id) VALUES (?, ?)');
  insertUserGroup.run('u_marcus', 'grp_sec');
  insertUserGroup.run('u_sarah', 'grp_sec');

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;

  console.log('  Seeding headline demo bugs (§5 & §13)...');

  // 3. Seed Headline Bug #412 (Crash on save when offline - In Review, stalled 4d waiting on Alex's review?)
  const bug412CreatedAt = new Date(now - 14 * DAY_MS).toISOString();
  const insertBug = db.prepare(`
    INSERT INTO bugs (
      id, title, description, status, severity, priority, component_id, reporter_id, assignee_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBug.run(
    412,
    'Crash on save when offline',
    'Application throws uncaught NullPointerException in SyncEngine when attempting to persist document while network state is disconnected. Needs fallback to local SQLite queue.',
    'In Review',
    'critical',
    'highest',
    'core',
    'u_sam',
    'u_sam',
    bug412CreatedAt,
    new Date(now - 4 * DAY_MS).toISOString()
  );

  // Activities for #412
  const insertActivity = db.prepare(`
    INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // reported -> triaged (2d 4h)
  insertActivity.run(412, 'u_sam', 'status', null, 'Unconfirmed', 0, new Date(now - 14 * DAY_MS).toISOString());
  insertActivity.run(412, 'u_priya', 'status', 'Unconfirmed', 'Confirmed', 0, new Date(now - 11.8 * DAY_MS).toISOString());
  // triaged -> branch (1d 2h)
  insertActivity.run(412, 'u_sam', 'status', 'Confirmed', 'In Progress', 0, new Date(now - 10.7 * DAY_MS).toISOString());
  // PR opened (3h)
  insertActivity.run(412, null, 'git_branch', null, 'branch:fix/offline-save-crash', 1, new Date(now - 10.5 * DAY_MS).toISOString());
  insertActivity.run(412, null, 'git_pr', null, 'PR #89: Fix crash during offline document save', 1, new Date(now - 10.3 * DAY_MS).toISOString());
  insertActivity.run(412, 'u_sam', 'status', 'In Progress', 'In Review', 0, new Date(now - 10.3 * DAY_MS).toISOString());

  // Git links for #412
  const insertGitLink = db.prepare(`
    INSERT INTO git_links (bug_id, kind, ref, url, state, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertGitLink.run(412, 'BRANCH', 'fix/offline-save-crash', 'https://github.com/triarc/core/tree/fix/offline-save-crash', 'active', new Date(now - 10.5 * DAY_MS).toISOString());
  insertGitLink.run(412, 'PR', 'PR #89', 'https://github.com/triarc/core/pull/89', 'open', new Date(now - 10.3 * DAY_MS).toISOString());
  insertGitLink.run(412, 'COMMIT', '8b3c9a1', 'https://github.com/triarc/core/commit/8b3c9a1', 'active', new Date(now - 10.3 * DAY_MS).toISOString());

  // Flag review? for #412 requested from Alex (stalled for ~4 days!)
  const insertFlag = db.prepare(`
    INSERT INTO flags (type_id, bug_id, status, setter_id, requestee_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertFlag.run('ft_review', 412, '?', 'u_sam', 'u_alex', new Date(now - 4.1 * DAY_MS).toISOString());
  insertActivity.run(412, 'u_sam', 'flag_created', null, 'Requested review? for @alex', 0, new Date(now - 4.1 * DAY_MS).toISOString());

  // Comments for #412
  const insertComment = db.prepare(`
    INSERT INTO comments (bug_id, author_id, body, is_private, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertComment.run(412, 'u_sam', 'I have pushed PR #89 with the local queue fallback. @alex please review the SQLite locking logic.', 0, new Date(now - 4.1 * DAY_MS).toISOString());

  indexBugEmbedding(412, 'Crash on save when offline', 'Application throws uncaught NullPointerException in SyncEngine when attempting to persist document while network state is disconnected.');

  // 4. Headline Bug #398 (Login fails on mobile Safari - needinfo? requested from Priya)
  insertBug.run(
    398,
    'Login fails on mobile Safari with cookies disabled',
    'Authentication session handshake returns 401 loop when third-party cookie restrictions are active on iOS Safari 17.5+.',
    'Confirmed',
    'major',
    'high',
    'auth',
    'u_chen',
    'u_sam',
    new Date(now - 2 * DAY_MS).toISOString(),
    new Date(now - 6 * HOUR_MS).toISOString()
  );
  insertActivity.run(398, 'u_chen', 'status', null, 'Unconfirmed', 0, new Date(now - 2 * DAY_MS).toISOString());
  insertActivity.run(398, 'u_priya', 'status', 'Unconfirmed', 'Confirmed', 0, new Date(now - 1.5 * DAY_MS).toISOString());
  insertFlag.run('ft_needinfo', 398, '?', 'u_sam', 'u_priya', new Date(now - 6 * HOUR_MS).toISOString());
  insertComment.run(398, 'u_sam', '@priya Could you confirm if this happens on standard Safari or Private Browsing mode specifically?', 0, new Date(now - 6 * HOUR_MS).toISOString());
  indexBugEmbedding(398, 'Login fails on mobile Safari with cookies disabled', 'Authentication session handshake returns 401 loop when third-party cookie restrictions are active on iOS Safari 17.5+.');

  // 5. Seed Duplicate Radar Match Candidates (for live dedup demo testing)
  insertBug.run(
    102,
    'Fatal error when saving file while disconnected from internet',
    'When user loses wifi connectivity and hits cmd+s, editor throws fatal exception and loses dirty buffer changes.',
    'Resolved',
    'critical',
    'high',
    'core',
    'u_chen',
    'u_alex',
    new Date(now - 20 * DAY_MS).toISOString(),
    new Date(now - 18 * DAY_MS).toISOString()
  );
  indexBugEmbedding(102, 'Fatal error when saving file while disconnected from internet', 'When user loses wifi connectivity and hits cmd+s, editor throws fatal exception and loses dirty buffer changes.');

  insertBug.run(
    103,
    'Uncaught exception in SyncEngine during offline document save',
    'SyncEngine does not check network reachable state prior to calling HTTP sync endpoint, resulting in unhandled promise rejection.',
    'Resolved',
    'major',
    'high',
    'core',
    'u_sam',
    'u_sam',
    new Date(now - 25 * DAY_MS).toISOString(),
    new Date(now - 22 * DAY_MS).toISOString()
  );
  indexBugEmbedding(103, 'Uncaught exception in SyncEngine during offline document save', 'SyncEngine does not check network reachable state prior to calling HTTP sync endpoint, resulting in unhandled promise rejection.');

  // 6. Seed Sleeper Branch Bug (branch quiet for > 3 days while In Progress)
  insertBug.run(
    250,
    'Refactor SSE connection recovery and exponential backoff',
    'Improve reconnection jitter and handle network sleep wake-up events on background tab restoration.',
    'In Progress',
    'normal',
    'normal',
    'api',
    'u_priya',
    'u_alex',
    new Date(now - 8 * DAY_MS).toISOString(),
    new Date(now - 5 * DAY_MS).toISOString()
  );
  insertActivity.run(250, 'u_priya', 'status', null, 'In Progress', 0, new Date(now - 8 * DAY_MS).toISOString());
  insertGitLink.run(250, 'BRANCH', 'refactor/sse-backoff', 'https://github.com/triarc/api/tree/refactor/sse-backoff', 'active', new Date(now - 4.5 * DAY_MS).toISOString());
  indexBugEmbedding(250, 'Refactor SSE connection recovery and exponential backoff', 'Improve reconnection jitter and handle network sleep wake-up events on background tab restoration.');

  // 7. Seed Confidential Security Bug
  insertBug.run(
    999,
    'Potential JWT token confusion with asymmetric public keys',
    'Algorithm validation must reject none and HMAC when RS256 key is expected in verification headers.',
    'In Progress',
    'blocker',
    'highest',
    'auth',
    'u_sarah',
    'u_marcus',
    new Date(now - 3 * DAY_MS).toISOString(),
    new Date(now - 1 * DAY_MS).toISOString()
  );
  db.prepare("UPDATE bugs SET security_group_id = 'grp_sec' WHERE id = 999").run();
  indexBugEmbedding(999, 'Potential JWT token confusion with asymmetric public keys', 'Algorithm validation must reject none and HMAC when RS256 key is expected in verification headers.');

  console.log('  Seeding 140+ simulated multi-week historical bugs...');

  const components = ['core', 'auth', 'ui', 'api', 'db', 'git'];
  const severities = ['blocker', 'critical', 'major', 'normal', 'minor', 'trivial', 'enhancement'];
  const priorities = ['highest', 'high', 'normal', 'low', 'lowest'];
  const users = ['u_alex', 'u_sam', 'u_priya', 'u_marcus', 'u_chen'];

  const bugTitles = [
    'Memory leak in query result streaming when client disconnects early',
    'Dark mode contrast ratio fails WCAG AA on table secondary headers',
    'Database deadlock on simultaneous activity audit log write transactions',
    'Command palette shortcut does not open when focus is inside Monaco editor',
    'Webhook verification fails with chunked transfer encoding payloads',
    'Missing index on activity(bug_id, created_at) causing slow timeline reads',
    'Duplicate radar cosine calculation blocks main event loop on large corpus',
    'Flag approval button stays disabled after permission role grant',
    'Relationship force graph node overlap on highly connected clusters',
    'Rate limiting header X-RateLimit-Reset format is unix seconds instead of ms',
    'SSE heartbeat timer leaks intervals on rapid component remounting',
    'Export to CSV misses custom field resolutions and timestamps',
    'Keyboard shortcut j/k navigation skips over resolved items in dense list',
    'Attachments larger than 15MB cause buffer allocation exception',
    'Status transition guard fails with unclear error message when comment empty',
    'Filter bar query parser drops tokens containing hyphens or colons',
    'Presence indicator shows offline users after 30 seconds of tab inactivity',
    'OAuth token refresh race condition causes intermittent 401s',
    'Cumulative flow diagram area rendering inverted on negative step deltas',
    'Bug table column resize handle target area is too narrow for touch devices',
    'Session storage quota exceeded when caching embedding model weights',
    'Stalled segment tooltip covers close button on low resolution viewports',
    'Activity feed diff renderer escapes markdown syntax in comment updates',
    'Git commit regex misses uppercase Fixes # and Closes # tags',
    'Search AST evaluator does not support negation operator -is:closed',
    'Drag and drop attachment area does not show active border on dragenter',
    'PostgreSQL migration script missing foreign key cascade on flag deletion',
    'Inbox tab badge count does not decrease when flag is resolved externally',
    'Worker thread pool terminates unexpectedly under high CPU pressure',
    'Breadcrumb navigation breaks when bug title contains forward slashes'
  ];

  for (let i = 1; i <= 140; i++) {
    const titleTemplate = bugTitles[(i - 1) % bugTitles.length];
    const title = `${titleTemplate} (${i > bugTitles.length ? `variation #${i}` : `issue #${i}`})`;
    const component = components[i % components.length];
    const severity = severities[i % severities.length];
    const priority = priorities[i % priorities.length];
    const reporter = users[i % users.length];
    const assignee = users[(i + 1) % users.length];

    // Distribute creation across past 45 days
    const daysAgo = (140 - i) * 0.3 + (i % 5);
    const createdDate = new Date(now - daysAgo * DAY_MS);
    const createdIso = createdDate.toISOString();

    // Determine lifecycle state
    let status = 'Resolved';
    if (i % 7 === 0) status = 'In Progress';
    else if (i % 9 === 0) status = 'In Review';
    else if (i % 11 === 0) status = 'Confirmed';
    else if (i % 13 === 0) status = 'Unconfirmed';
    else if (i % 17 === 0) status = 'Verified';
    else if (i % 19 === 0) status = 'Closed';
    else if (i % 23 === 0) status = 'Duplicate';

    const result = insertBug.run(
      null,
      title,
      `Detailed investigation report for issue #${i}. This occurs intermittently during high volume batch processing and requires verification of state invariants across asynchronous worker boundaries.`,
      status,
      severity,
      priority,
      component,
      reporter,
      assignee,
      createdIso,
      new Date(createdDate.getTime() + 1.5 * DAY_MS).toISOString()
    );

    const bugId = Number(result.lastInsertRowid);

    // Initial creation activity
    insertActivity.run(bugId, reporter, 'status', null, 'Unconfirmed', 0, createdIso);

    // If transitioned through lifecycle, write sequential activities
    if (status !== 'Unconfirmed') {
      const confirmDate = new Date(createdDate.getTime() + 0.8 * DAY_MS).toISOString();
      insertActivity.run(bugId, 'u_priya', 'status', 'Unconfirmed', 'Confirmed', 0, confirmDate);

      if (status !== 'Confirmed') {
        const progDate = new Date(createdDate.getTime() + 1.6 * DAY_MS).toISOString();
        insertActivity.run(bugId, assignee, 'status', 'Confirmed', 'In Progress', 0, progDate);

        if (status === 'In Review' || status === 'Resolved' || status === 'Verified' || status === 'Closed') {
          const revDate = new Date(createdDate.getTime() + 2.8 * DAY_MS).toISOString();
          insertActivity.run(bugId, assignee, 'status', 'In Progress', 'In Review', 0, revDate);

          if (status === 'Resolved' || status === 'Verified' || status === 'Closed') {
            const resDate = new Date(createdDate.getTime() + 3.9 * DAY_MS).toISOString();
            insertActivity.run(bugId, assignee, 'status', 'In Review', 'Resolved', 1, resDate);

            if (status === 'Verified' || status === 'Closed') {
              const verDate = new Date(createdDate.getTime() + 4.5 * DAY_MS).toISOString();
              insertActivity.run(bugId, 'u_priya', 'status', 'Resolved', 'Verified', 0, verDate);
            }
          }
        }
      }
    }

    // Add some random flags
    if (i % 6 === 0) {
      insertFlag.run('ft_review', bugId, i % 2 === 0 ? '+' : '?', reporter, assignee, new Date(createdDate.getTime() + 2 * DAY_MS).toISOString());
    } else if (i % 8 === 0) {
      insertFlag.run('ft_needinfo', bugId, i % 2 === 0 ? '+' : '?', assignee, reporter, new Date(createdDate.getTime() + 1 * DAY_MS).toISOString());
    }

    // Add git links
    if (i % 3 === 0) {
      insertGitLink.run(bugId, 'BRANCH', `feat/issue-${bugId}`, `https://github.com/triarc/core/tree/feat/issue-${bugId}`, status === 'Resolved' ? 'merged' : 'active', createdIso);
      insertGitLink.run(bugId, 'PR', `PR #${100 + bugId}`, `https://github.com/triarc/core/pull/${100 + bugId}`, status === 'Resolved' ? 'merged' : 'open', createdIso);
    }

    // Index embeddings
    indexBugEmbedding(bugId, title, `Detailed investigation report for issue #${i}.`);
  }

  // Create some relationships
  console.log('  Linking bug relationships...');
  const insertRel = db.prepare('INSERT INTO relationships (from_bug_id, to_bug_id, type, created_at) VALUES (?, ?, ?, ?)');
  insertRel.run(412, 102, 'DUPLICATE_OF', new Date(now - 10 * DAY_MS).toISOString());
  insertRel.run(412, 103, 'RELATED_TO', new Date(now - 9 * DAY_MS).toISOString());
  insertRel.run(398, 250, 'BLOCKS', new Date(now - 1 * DAY_MS).toISOString());

  const totalBugs = db.prepare('SELECT COUNT(*) as count FROM bugs').get() as { count: number };
  const totalActivities = db.prepare('SELECT COUNT(*) as count FROM activity').get() as { count: number };
  const totalFlags = db.prepare('SELECT COUNT(*) as count FROM flags').get() as { count: number };

  console.log(`✅ Seeding complete! Populated:`);
  console.log(`   - ${totalBugs.count} bugs`);
  console.log(`   - ${totalActivities.count} activity audit rows`);
  console.log(`   - ${totalFlags.count} request flags`);
  console.log(`   - Headline Bug #412 with stalled In Review flow timeline & review? flag to @alex`);
  console.log(`   - Headline Bug #398 with needinfo? flag to @priya`);
}

// If run directly via node / tsx
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
