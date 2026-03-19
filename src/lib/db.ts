import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "hackathon.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT NOT NULL,
      description TEXT NOT NULL,
      video_url TEXT DEFAULT '',
      video_file TEXT DEFAULT '',
      code_url TEXT DEFAULT '',
      materials TEXT DEFAULT '',
      elo INTEGER DEFAULT 1500,
      investor_stars INTEGER DEFAULT 0,
      score_ai_breadth REAL DEFAULT 0,
      score_ai_depth REAL DEFAULT 0,
      score_work_fit REAL DEFAULT 0,
      score_completeness REAL DEFAULT 0,
      score_creativity REAL DEFAULT 0,
      score_weighted REAL DEFAULT 0,
      ai_summary TEXT DEFAULT '',
      ai_highlights TEXT DEFAULT '',
      ai_improvements TEXT DEFAULT '',
      ai_reasoning TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matchups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_a_id TEXT NOT NULL,
      project_b_id TEXT NOT NULL,
      winner_id TEXT NOT NULL,
      elo_change REAL NOT NULL,
      reasoning TEXT DEFAULT '',
      key_differentiator TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_a_id) REFERENCES projects(id),
      FOREIGN KEY (project_b_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS investor_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investor_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );
  `);

  // Migration: add new columns if they don't exist
  const cols = db.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has("video_file")) {
    db.exec("ALTER TABLE projects ADD COLUMN video_file TEXT DEFAULT ''");
  }
  if (!colNames.has("ai_highlights")) {
    db.exec("ALTER TABLE projects ADD COLUMN ai_highlights TEXT DEFAULT ''");
  }
  if (!colNames.has("ai_improvements")) {
    db.exec("ALTER TABLE projects ADD COLUMN ai_improvements TEXT DEFAULT ''");
  }
  if (!colNames.has("ai_reasoning")) {
    db.exec("ALTER TABLE projects ADD COLUMN ai_reasoning TEXT DEFAULT '{}'");
  }

  const matchCols = db.prepare("PRAGMA table_info(matchups)").all() as { name: string }[];
  const matchColNames = new Set(matchCols.map((c) => c.name));
  if (!matchColNames.has("key_differentiator")) {
    db.exec("ALTER TABLE matchups ADD COLUMN key_differentiator TEXT DEFAULT ''");
  }
}
