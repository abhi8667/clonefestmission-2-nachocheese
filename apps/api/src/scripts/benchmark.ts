/**
 * Triarc Production Scale Benchmark (§9 Performance Evidence)
 * Evaluates Triarc query latency and database performance on a 10,000 bug + 100,000 activity row dataset.
 *
 * Target: p95 latency < 150ms across all core workflows.
 * Run with: npx tsx src/scripts/benchmark.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BENCHMARK_DB_PATH = path.resolve(__dirname, '../../benchmark_triarc.db');

// Clean existing benchmark DB if present
if (fs.existsSync(BENCHMARK_DB_PATH)) {
  fs.unlinkSync(BENCHMARK_DB_PATH);
}

console.log('⚡ Initializing Triarc Benchmark Environment...');
console.log(`📁 Database Path: ${BENCHMARK_DB_PATH}`);

const db = new Database(BENCHMARK_DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache

// 1. Initialize Schema with full production indexes
db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'triager', 'developer', 'reporter', 'guest')),
    security_group_ids TEXT,
    avatar_url TEXT
  );

  CREATE TABLE bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Unconfirmed',
    severity TEXT NOT NULL DEFAULT 'normal',
    priority TEXT NOT NULL DEFAULT 'normal',
    component_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    assignee_id TEXT,
    security_group_id TEXT,
    target_milestone TEXT,
    version TEXT,
    estimated_time REAL DEFAULT 0,
    remaining_time REAL DEFAULT 0,
    duplicate_of INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id INTEGER NOT NULL,
    actor_id TEXT,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    automated INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_id TEXT NOT NULL,
    bug_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT '?',
    setter_id TEXT NOT NULL,
    requestee_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE watchers (
    bug_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (bug_id, user_id)
  );

  CREATE TABLE bug_keywords (
    bug_id INTEGER NOT NULL,
    keyword_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (bug_id, keyword_id)
  );

  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    bug_id INTEGER,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  -- Production Indexes for ultra-fast lookups
  CREATE INDEX idx_bugs_status_component ON bugs(status, component_id);
  CREATE INDEX idx_bugs_assignee ON bugs(assignee_id);
  CREATE INDEX idx_bugs_milestone ON bugs(target_milestone);
  CREATE INDEX idx_bugs_security ON bugs(security_group_id);
  CREATE INDEX idx_activity_bug_created ON activity(bug_id, created_at);
  CREATE INDEX idx_activity_field ON activity(field, created_at);
  CREATE INDEX idx_flags_requestee_status ON flags(requestee_id, status);
  CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
`);

console.log('🌱 Seeding 10,000 bugs and 100,000 activity audit rows in transaction...');
const seedStart = Date.now();

const insertUser = db.prepare(`INSERT INTO users (id, name, username, email, role) VALUES (?, ?, ?, ?, ?)`);
insertUser.run('admin', 'Admin User', 'admin', 'admin@triarc.dev', 'admin');
insertUser.run('alex', 'Alex River', 'alex', 'alex@triarc.dev', 'developer');
insertUser.run('sam', 'Sam Taylor', 'sam', 'sam@triarc.dev', 'developer');
insertUser.run('priya', 'Priya Patel', 'priya', 'priya@triarc.dev', 'triager');
insertUser.run('jordan', 'Jordan Lee', 'jordan', 'jordan@triarc.dev', 'reporter');

const components = ['core', 'auth', 'ui', 'api', 'db', 'git'];
const severities = ['blocker', 'critical', 'major', 'normal', 'minor', 'trivial'];
const priorities = ['highest', 'high', 'normal', 'low', 'lowest'];
const statuses = ['Unconfirmed', 'Confirmed', 'In Progress', 'In Review', 'Resolved', 'Verified', 'Closed'];
const milestones = ['v2.1', 'v2.2', 'v2.3', null];
const users = ['admin', 'alex', 'sam', 'priya', 'jordan'];

const insertBug = db.prepare(`
  INSERT INTO bugs (
    title, description, status, severity, priority, component_id, reporter_id, assignee_id, security_group_id, target_milestone, version, estimated_time, remaining_time, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertActivity = db.prepare(`
  INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, automated, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertFlag = db.prepare(`
  INSERT INTO flags (type_id, bug_id, status, setter_id, requestee_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertNotification = db.prepare(`
  INSERT INTO notifications (user_id, bug_id, title, body, read, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const seedBatch = db.transaction(() => {
  const baseTime = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days ago

  for (let i = 1; i <= 10000; i++) {
    const component = components[i % components.length];
    const severity = severities[i % severities.length];
    const priority = priorities[i % priorities.length];
    const status = statuses[i % statuses.length];
    const milestone = milestones[i % milestones.length];
    const reporter = users[i % users.length];
    const assignee = i % 5 === 0 ? null : users[(i + 1) % users.length];
    const isSec = i % 25 === 0 ? 'grp_sec' : null;
    const createdAt = new Date(baseTime + (i * 500000)).toISOString();

    insertBug.run(
      `Issue #${i}: Memory leak in ${component} when processing batch payload ${i}`,
      `Reproduction steps for issue ${i}: NPE thrown in sync subsystem during high throughput concurrency.`,
      status,
      severity,
      priority,
      component,
      reporter,
      assignee,
      isSec,
      milestone,
      '2.0.4',
      8.0,
      status === 'Resolved' || status === 'Verified' || status === 'Closed' ? 0 : 4.0,
      createdAt,
      createdAt
    );

    // Seed flags on some bugs
    if (i % 8 === 0) {
      insertFlag.run('ft_review', i, '?', 'sam', 'alex', createdAt);
    }
  }

  // Seed 100,000 activity audit rows
  for (let a = 1; a <= 100000; a++) {
    const bugId = ((a * 7) % 10000) + 1;
    const field = a % 3 === 0 ? 'status' : a % 3 === 1 ? 'comment' : 'assignee';
    const oldVal = field === 'status' ? 'Unconfirmed' : 'unassigned';
    const newVal = field === 'status' ? 'In Progress' : 'alex';
    const createdAt = new Date(baseTime + (a * 50000)).toISOString();

    insertActivity.run(
      bugId,
      users[a % users.length],
      field,
      oldVal,
      newVal,
      a % 10 === 0 ? 1 : 0,
      createdAt
    );
  }

  // Seed 5,000 notifications
  for (let n = 1; n <= 5000; n++) {
    const bugId = ((n * 13) % 10000) + 1;
    insertNotification.run(
      users[n % users.length],
      bugId,
      `Status changed on Bug #${bugId}`,
      `Bug was updated to In Review`,
      n % 4 === 0 ? 1 : 0,
      new Date().toISOString()
    );
  }
});

seedBatch();
const seedDuration = ((Date.now() - seedStart) / 1000).toFixed(2);
console.log(`✅ Seed complete in ${seedDuration}s. Database populated.`);

// 2. Query Scenarios Benchmark
interface BenchmarkResult {
  scenario: string;
  iterations: number;
  p50_ms: number;
  p95_ms: number;
  target_ms: number;
  status: 'PASS' | 'FAIL';
}

function runBenchmark(name: string, iterations: number, queryFn: () => void): BenchmarkResult {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    queryFn();
  }

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    queryFn();
    const t1 = performance.now();
    times.push(t1 - t0);
  }

  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];

  return {
    scenario: name,
    iterations,
    p50_ms: Math.round(p50 * 100) / 100,
    p95_ms: Math.round(p95 * 100) / 100,
    target_ms: 150,
    status: p95 < 150 ? 'PASS' : 'FAIL'
  };
}

console.log('\n📊 Running Scale Latency Benchmarks (10,000 Bugs + 100,000 Activity Rows)...\n');

const results: BenchmarkResult[] = [];

// Scenario 1: Filtered triage query with status & component (indexed)
const stmtFiltered = db.prepare("SELECT * FROM bugs WHERE status = ? AND component_id = ? LIMIT 50");
results.push(runBenchmark('1. Filtered Bug Table (status & component)', 100, () => {
  stmtFiltered.all('In Progress', 'core');
}));

// Scenario 2: Milestone delivery query
const stmtMilestone = db.prepare("SELECT * FROM bugs WHERE target_milestone = ? LIMIT 50");
results.push(runBenchmark('2. Milestone Slice Query (milestone = v2.1)', 100, () => {
  stmtMilestone.all('v2.1');
}));

// Scenario 3: Request Inbox query for @alex
const stmtInbox = db.prepare("SELECT * FROM flags WHERE requestee_id = ? AND status = '?' LIMIT 50");
results.push(runBenchmark('3. Request Inbox (? flags for requestee)', 100, () => {
  stmtInbox.all('alex');
}));

// Scenario 4: Bug Detail hydration with full activity history
const stmtBug = db.prepare("SELECT * FROM bugs WHERE id = ?");
const stmtBugActivity = db.prepare("SELECT * FROM activity WHERE bug_id = ? ORDER BY created_at ASC");
results.push(runBenchmark('4. Bug Detail + Activity History Hydration', 100, () => {
  const bug = stmtBug.get(412);
  const acts = stmtBugActivity.all(412);
}));

// Scenario 5: Full-text LIKE search on title
const stmtSearch = db.prepare("SELECT * FROM bugs WHERE title LIKE ? OR description LIKE ? LIMIT 50");
results.push(runBenchmark('5. Full-Text Search (title LIKE %payload%)', 100, () => {
  stmtSearch.all('%payload 45%', '%payload 45%');
}));

// Scenario 6: Unread notifications count
const stmtNotif = db.prepare("SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND read = 0");
results.push(runBenchmark('6. Unread Notification Count', 100, () => {
  stmtNotif.get('alex');
}));

// Scenario 7: State Transition + Audit Row Write Transaction
const stmtUpdate = db.prepare("UPDATE bugs SET status = ?, updated_at = ? WHERE id = ?");
const stmtInsertAct = db.prepare("INSERT INTO activity (bug_id, actor_id, field, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?)");
const transitionTx = db.transaction((id: number, to: string) => {
  stmtUpdate.run(to, new Date().toISOString(), id);
  stmtInsertAct.run(id, 'alex', 'status', 'In Progress', to, new Date().toISOString());
});
results.push(runBenchmark('7. State Transition Transaction (Write + Audit)', 100, () => {
  transitionTx(500, 'In Review');
}));

// Scenario 8: Flow analytics aggregated status counts across 100k events
const stmtAgg = db.prepare(`
  SELECT field, count(*) as count
  FROM activity
  WHERE created_at >= datetime('now', '-30 days')
  GROUP BY field
`);
results.push(runBenchmark('8. 30-Day Activity Field Aggregation', 50, () => {
  stmtAgg.all();
}));

// 3. EXPLAIN QUERY PLAN verification
console.log('🔍 EXPLAIN QUERY PLAN Verification:');
const planFiltered = db.prepare("EXPLAIN QUERY PLAN SELECT * FROM bugs WHERE status = 'In Progress' AND component_id = 'core'").all();
console.log('  • Filtered Status/Component Query Plan:');
planFiltered.forEach((p: any) => console.log(`    -> ${p.detail}`));

const planFlags = db.prepare("EXPLAIN QUERY PLAN SELECT * FROM flags WHERE requestee_id = 'alex' AND status = '?'").all();
console.log('  • Request Inbox Query Plan:');
planFlags.forEach((p: any) => console.log(`    -> ${p.detail}`));

// 4. Output Summary Table
console.log('\n========================================================================================');
console.log('TRIARC SCALE BENCHMARK REPORT (10,000 BUGS / 100,000 ACTIVITY ROWS)');
console.log('========================================================================================');
console.log('| Scenario                                      | Iterations | p50 (ms) | p95 (ms) | Target  | Status |');
console.log('|-----------------------------------------------|------------|----------|----------|---------|--------|');

for (const r of results) {
  const scPadded = r.scenario.padEnd(45, ' ');
  const itPadded = String(r.iterations).padStart(10, ' ');
  const p50Padded = String(r.p50_ms.toFixed(2)).padStart(8, ' ');
  const p95Padded = String(r.p95_ms.toFixed(2)).padStart(8, ' ');
  const targetPadded = `< ${r.target_ms}ms`.padStart(7, ' ');
  const statusStr = r.status === 'PASS' ? ' ✅ PASS' : ' ❌ FAIL';
  console.log(`| ${scPadded} | ${itPadded} | ${p50Padded} | ${p95Padded} | ${targetPadded} |${statusStr} |`);
}
console.log('========================================================================================\n');

// Clean up benchmark DB file
db.close();
if (fs.existsSync(BENCHMARK_DB_PATH)) {
  fs.unlinkSync(BENCHMARK_DB_PATH);
}
console.log('🧹 Cleaned up temporary benchmark database file.');
