// Each entry runs once, in order. Never edit a shipped migration — append a new one.
export const migrations: string[] = [
  `
  CREATE TABLE projects (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    stack       TEXT,
    links_json  TEXT NOT NULL DEFAULT '[]',
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );
  CREATE TABLE sessions (
    id          INTEGER PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    paused_ms   INTEGER NOT NULL DEFAULT 0,
    note        TEXT,
    summary     TEXT
  );
  CREATE TABLE session_pauses (
    id          INTEGER PRIMARY KEY,
    session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    started_at  INTEGER NOT NULL,
    ended_at    INTEGER,
    reason      TEXT NOT NULL            -- 'manual' | 'idle'
  );
  CREATE TABLE tasks (
    id          INTEGER PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'todo',  -- 'todo' | 'doing' | 'done'
    session_id  INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    created_at  INTEGER NOT NULL,
    done_at     INTEGER
  );
  CREATE TABLE claude_events (
    id          INTEGER PRIMARY KEY,
    project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    session_id  INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    type        TEXT NOT NULL,
    payload     TEXT NOT NULL,
    at          INTEGER NOT NULL
  );
  CREATE INDEX idx_sessions_project ON sessions(project_id, started_at);
  CREATE INDEX idx_tasks_project ON tasks(project_id, status);
  `,
  `
  CREATE TABLE settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
  ALTER TABLE projects ADD COLUMN last_commit_at INTEGER;
  `,
  `
  ALTER TABLE tasks ADD COLUMN notes TEXT;
  ALTER TABLE tasks ADD COLUMN position REAL NOT NULL DEFAULT 0;
  CREATE INDEX idx_tasks_session ON tasks(session_id);
  `
]
