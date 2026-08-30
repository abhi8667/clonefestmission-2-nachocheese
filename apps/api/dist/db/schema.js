import { db } from './database.js';
export function initializeDatabase() {
    db.exec(`
    -- Users & Groups
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_url TEXT,
      password_hash TEXT,
      is_external INTEGER DEFAULT 0
    );

    -- Imported GitHub Repositories (W9)
    CREATE TABLE IF NOT EXISTS imported_repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      issue_count INTEGER DEFAULT 0,
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS user_group_map (
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      PRIMARY KEY (user_id, group_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Projects & Project Memberships
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      department_id TEXT,
      repo_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL, -- reporter | developer | triager | admin
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS components (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      project_id TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Milestones & Versions (§3 Capability)
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      due_date TEXT
    );

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL
    );

    -- Keywords / Labels (§3 Capability)
    CREATE TABLE IF NOT EXISTS keywords (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    -- Bugs
    CREATE TABLE IF NOT EXISTS bugs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      priority TEXT NOT NULL,
      component_id TEXT NOT NULL,
      project_id TEXT,
      reporter_id TEXT NOT NULL,
      assignee_id TEXT,
      resolution TEXT,
      duplicate_of INTEGER,
      security_group_id TEXT,
      time_in_state_json TEXT,
      version TEXT,
      target_milestone TEXT,
      estimated_time REAL DEFAULT 0,
      remaining_time REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (component_id) REFERENCES components(id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (security_group_id) REFERENCES groups(id)
    );

    CREATE TABLE IF NOT EXISTS bug_keywords (
      bug_id INTEGER NOT NULL,
      keyword_id TEXT NOT NULL,
      PRIMARY KEY (bug_id, keyword_id),
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
    );

    -- Watchers / CC List (§3 Capability)
    CREATE TABLE IF NOT EXISTS watchers (
      bug_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (bug_id, user_id),
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Saved Searches (§3 Capability)
    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      query TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Notifications / Event Routing (§3 Capability)
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      bug_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bug_group_map (
      bug_id INTEGER NOT NULL,
      group_id TEXT NOT NULL,
      PRIMARY KEY (bug_id, group_id),
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Activity audit log (Every field change, human or automated)
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bug_id INTEGER NOT NULL,
      actor_id TEXT, -- NULL represents system/automated action
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      automated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );

    -- Relationships (first-class rows)
    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_bug_id INTEGER NOT NULL,
      to_bug_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- BLOCKS | DEPENDS_ON | DUPLICATE_OF | RELATED_TO
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (to_bug_id) REFERENCES bugs(id) ON DELETE CASCADE
    );

    -- Flags: typed, permissioned requests
    CREATE TABLE IF NOT EXISTS flag_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target TEXT NOT NULL,
      is_requestable INTEGER DEFAULT 1,
      is_requesteeble INTEGER DEFAULT 1,
      grant_role TEXT NOT NULL,
      request_role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id TEXT NOT NULL,
      bug_id INTEGER NOT NULL,
      attach_id INTEGER,
      status TEXT NOT NULL, -- ? | + | -
      setter_id TEXT NOT NULL,
      requestee_id TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (type_id) REFERENCES flag_types(id),
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (setter_id) REFERENCES users(id),
      FOREIGN KEY (requestee_id) REFERENCES users(id)
    );

    -- Git links (branches, commits, PRs)
    CREATE TABLE IF NOT EXISTS git_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bug_id INTEGER NOT NULL,
      kind TEXT NOT NULL, -- BRANCH | PR | COMMIT
      ref TEXT NOT NULL,
      url TEXT NOT NULL,
      state TEXT NOT NULL, -- open | closed | merged | active | stale
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE
    );

    -- Comments & Attachments (with Work Time logging)
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bug_id INTEGER NOT NULL,
      author_id TEXT NOT NULL,
      body TEXT NOT NULL,
      work_time REAL DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bug_id INTEGER NOT NULL,
      uploader_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      is_private INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    -- Dedup embeddings index
    CREATE TABLE IF NOT EXISTS bug_embeddings (
      bug_id INTEGER PRIMARY KEY,
      vector_json TEXT NOT NULL,
      FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE
    );
  `);
    // Safe ALTER TABLE migrations for existing databases (runs before indexes)
    const alterColumns = [
        { table: 'bugs', col: 'project_id', def: 'TEXT' },
        { table: 'bugs', col: 'version', def: 'TEXT' },
        { table: 'bugs', col: 'target_milestone', def: 'TEXT' },
        { table: 'bugs', col: 'estimated_time', def: 'REAL DEFAULT 0' },
        { table: 'bugs', col: 'remaining_time', def: 'REAL DEFAULT 0' },
        { table: 'components', col: 'project_id', def: 'TEXT' },
        { table: 'comments', col: 'work_time', def: 'REAL DEFAULT 0' },
        { table: 'users', col: 'password_hash', def: 'TEXT' },
        { table: 'users', col: 'is_external', def: 'INTEGER DEFAULT 0' }
    ];
    for (const { table, col, def } of alterColumns) {
        try {
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        }
        catch {
            // Column already exists
        }
    }
    // Create indexes
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activity_bug_created ON activity(bug_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_bugs_status_comp ON bugs(status, component_id);
    CREATE INDEX IF NOT EXISTS idx_bugs_project ON bugs(project_id);
    CREATE INDEX IF NOT EXISTS idx_bugs_milestone ON bugs(target_milestone);
    CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_flags_req_status ON flags(requestee_id, status);
    CREATE INDEX IF NOT EXISTS idx_flags_setter_status ON flags(setter_id, status);
    CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_bug_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_bug_id);
    CREATE INDEX IF NOT EXISTS idx_git_links_bug ON git_links(bug_id);
    CREATE INDEX IF NOT EXISTS idx_watchers_bug ON watchers(bug_id);
    CREATE INDEX IF NOT EXISTS idx_watchers_user ON watchers(user_id);
    CREATE INDEX IF NOT EXISTS idx_bug_keywords_bug ON bug_keywords(bug_id);
    CREATE INDEX IF NOT EXISTS idx_bug_keywords_kw ON bug_keywords(keyword_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
  `);
    // Initialize standard projects if none exist
    const existingProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get();
    if (existingProjects.count === 0) {
        const insertProject = db.prepare(`
      INSERT INTO projects (id, key, name, description, department_id, repo_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
        insertProject.run('prj_core', 'CORE', 'Triarc Core Platform', 'Central system engine, telemetry, workflow engine, and real-time streaming services', 'dept_eng', 'https://github.com/triarc/core-engine');
        insertProject.run('prj_pay', 'PAY', 'Payment Gateway & Settlement', 'High-throughput payment orchestration, ledger consistency, and multi-currency billing', 'dept_fintech', 'https://github.com/triarc/payment-gateway');
        insertProject.run('prj_sec', 'SEC', 'Security & Zero Trust Auth', 'Identity provider, OAuth/JWT verification, confidential dossiers, and RBAC enforcement', 'dept_secops', 'https://github.com/triarc/zero-trust-auth');
        // Backfill any existing components and bugs to prj_core
        db.exec(`UPDATE components SET project_id = 'prj_core' WHERE project_id IS NULL`);
        db.exec(`UPDATE bugs SET project_id = 'prj_core' WHERE project_id IS NULL`);
    }
    // Initialize standard flag types if not exists
    const existingTypes = db.prepare('SELECT COUNT(*) as count FROM flag_types').get();
    if (existingTypes.count === 0) {
        const insertFlagType = db.prepare(`
      INSERT INTO flag_types (id, name, target, is_requestable, is_requesteeble, grant_role, request_role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        insertFlagType.run('ft_review', 'review?', 'bug', 1, 1, 'developer', 'developer');
        insertFlagType.run('ft_needinfo', 'needinfo?', 'bug', 1, 1, 'reporter', 'reporter');
        insertFlagType.run('ft_approval', 'approval?', 'bug', 1, 1, 'triager', 'developer');
    }
    // Initialize components
    const existingComps = db.prepare('SELECT COUNT(*) as count FROM components').get();
    if (existingComps.count === 0) {
        const insertComp = db.prepare('INSERT INTO components (id, name, description, project_id) VALUES (?, ?, ?, ?)');
        insertComp.run('core', 'Core Engine', 'Central business logic and processing pipeline', 'prj_core');
        insertComp.run('auth', 'Authentication & Security', 'Auth, JWT, RBAC, and encryption services', 'prj_sec');
        insertComp.run('ui', 'Web Client', 'React frontend interface, components, and styling', 'prj_core');
        insertComp.run('api', 'REST & SSE Gateway', 'Express HTTP API and real-time streaming', 'prj_core');
        insertComp.run('db', 'Storage & Persistence', 'SQLite database and migrations layer', 'prj_core');
        insertComp.run('git', 'GitHub Integration', 'Webhooks, commit scrapers, and branch linking', 'prj_core');
    }
    // Initialize default keywords
    const existingKws = db.prepare('SELECT COUNT(*) as count FROM keywords').get();
    if (existingKws.count === 0) {
        const insertKw = db.prepare('INSERT INTO keywords (id, name, description) VALUES (?, ?, ?)');
        insertKw.run('kw_regression', 'regression', 'Bug broke previously working functionality');
        insertKw.run('kw_perf', 'perf', 'Performance or latency degradation');
        insertKw.run('kw_crash', 'crash', 'Application exception, panic, or unexpected shutdown');
        insertKw.run('kw_security', 'security', 'Security vulnerability or auth issue');
        insertKw.run('kw_ux', 'ux', 'User experience and accessibility flaw');
        insertKw.run('kw_docs', 'docs', 'Documentation discrepancy or missing guide');
        insertKw.run('kw_help_wanted', 'help-wanted', 'Open for team contribution');
    }
    // Initialize default milestones
    const existingMilestones = db.prepare('SELECT COUNT(*) as count FROM milestones').get();
    if (existingMilestones.count === 0) {
        const now = new Date();
        const msInDay = 24 * 60 * 60 * 1000;
        const dueV21 = new Date(now.getTime() + 14 * msInDay).toISOString().split('T')[0];
        const dueV22 = new Date(now.getTime() + 45 * msInDay).toISOString().split('T')[0];
        const insertMilestone = db.prepare('INSERT INTO milestones (id, product_id, name, due_date) VALUES (?, ?, ?, ?)');
        insertMilestone.run('ms_v21', 'triarc', 'v2.1', dueV21);
        insertMilestone.run('ms_v22', 'triarc', 'v2.2', dueV22);
        const insertVersion = db.prepare('INSERT INTO versions (id, product_id, name) VALUES (?, ?, ?)');
        insertVersion.run('ver_204', 'triarc', '2.0.4');
        insertVersion.run('ver_210', 'triarc', '2.1.0-beta');
    }
}
//# sourceMappingURL=schema.js.map