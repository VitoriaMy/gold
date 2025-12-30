import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'gold.sqlite');

let db;

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function getDb() {
  if (db) return db;

  const dbPath = process.env.SQLITE_PATH || DEFAULT_DB_PATH;
  ensureDirForFile(dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS fetch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      url TEXT,
      fetched_at INTEGER NOT NULL,
      http_status INTEGER,
      payload_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gold_1d (
      date_time INTEGER PRIMARY KEY,
      price REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gold_30d (
      date_time INTEGER PRIMARY KEY,
      price REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  function migrateGoldTable(tableName) {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!cols?.length) return;
    const colNames = new Set(cols.map((c) => c.name));
    if (colNames.has('updated_at')) return;

    // Older schema used fetched_at/url/http_status and had id AUTOINCREMENT.
    if (!colNames.has('fetched_at')) return;

    const newTable = `${tableName}__v2`;
    db.exec(`
      DROP INDEX IF EXISTS idx_${tableName}_date_time;
      DROP INDEX IF EXISTS idx_${tableName}_updated_at;
      CREATE TABLE IF NOT EXISTS ${newTable} (
        date_time INTEGER PRIMARY KEY,
        price REAL NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Pick latest fetched_at per date_time.
    db.exec(`
      WITH latest AS (
        SELECT date_time, MAX(fetched_at) AS max_fetched_at
        FROM ${tableName}
        GROUP BY date_time
      )
      INSERT OR REPLACE INTO ${newTable}(date_time, price, updated_at)
      SELECT t.date_time, t.price, t.fetched_at
      FROM ${tableName} t
      JOIN latest l
        ON t.date_time = l.date_time AND t.fetched_at = l.max_fetched_at;

      DROP TABLE ${tableName};
      ALTER TABLE ${newTable} RENAME TO ${tableName};
    `);
  }

  try {
    migrateGoldTable('gold_1d');
    migrateGoldTable('gold_30d');
  } catch {
    // Ignore migration errors; app can still run with new DB.
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_fetch_log_kind_time ON fetch_log(kind, fetched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fetch_log_kind_hash ON fetch_log(kind, payload_hash);

    CREATE INDEX IF NOT EXISTS idx_gold_1d_date_time ON gold_1d(date_time DESC);
    CREATE INDEX IF NOT EXISTS idx_gold_30d_date_time ON gold_30d(date_time DESC);
    CREATE INDEX IF NOT EXISTS idx_gold_1d_updated_at ON gold_1d(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_gold_30d_updated_at ON gold_30d(updated_at DESC);
  `);

  return db;
}
