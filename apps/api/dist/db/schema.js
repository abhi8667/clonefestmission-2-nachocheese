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
      avatar_url TEXT
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

    CREATE TABLE IF NOT EXISTS components (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
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
      reporter_id TEXT NOT NULL,
      assignee_id TEXT,
      resolution TEXT,
      duplicate_of INTEGER,
      security_group_id TEXT,
      time_in_state_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (component_id) REFERENCES components(id),
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (security_group_id) REFERENCES groups(id)
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

    -- Comments & Attachments
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bug_id INTEGER NOT NULL,
      author_id TEXT NOT NULL,
      body TEXT NOT NULL,
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

    -- Critical Indexes (§9 target <150ms)
    CREATE INDEX IF NOT EXISTS idx_activity_bug_created ON activity(bug_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_bugs_status_comp ON bugs(status, component_id);
    CREATE INDEX IF NOT EXISTS idx_flags_req_status ON flags(requestee_id, status);
    CREATE INDEX IF NOT EXISTS idx_flags_setter_status ON flags(setter_id, status);
    CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_bug_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_bug_id);
    CREATE INDEX IF NOT EXISTS idx_git_links_bug ON git_links(bug_id);
  `);
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
        const insertComp = db.prepare('INSERT INTO components (id, name, description) VALUES (?, ?, ?)');
        insertComp.run('core', 'Core Engine', 'Central business logic and processing pipeline');
        insertComp.run('auth', 'Authentication & Security', 'Auth, JWT, RBAC, and encryption services');
        insertComp.run('ui', 'Web Client', 'React frontend interface, components, and styling');
        insertComp.run('api', 'REST & SSE Gateway', 'Express HTTP API and real-time streaming');
        insertComp.run('db', 'Storage & Persistence', 'SQLite database and migrations layer');
        insertComp.run('git', 'GitHub Integration', 'Webhooks, commit scrapers, and branch linking');
    }
}
//# sourceMappingURL=schema.js.map