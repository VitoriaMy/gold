import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'gold.sqlite');

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

const SQL = await initSqlJs({
  locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
});

let db;
let dbPath;
let opChain = Promise.resolve();

function persist() {
  if (!db || !dbPath) return;
  const data = db.export();
  ensureDirForFile(dbPath);
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export function queueDbOp(task) {
  const next = opChain.then(() => task());
  opChain = next.catch(() => undefined);
  return next;
}

function execAll(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function migrateGoldTable(tableName) {
  const cols = execAll(`PRAGMA table_info(${tableName})`);
  if (!cols?.length) return;
  const colNames = new Set(cols.map((c) => c.name));
  if (colNames.has('updated_at')) return;
  if (!colNames.has('fetched_at')) return;

  const newTable = `${tableName}__v2`;
  db.run(`
    DROP INDEX IF EXISTS idx_${tableName}_date_time;
    DROP INDEX IF EXISTS idx_${tableName}_updated_at;
    CREATE TABLE IF NOT EXISTS ${newTable} (
      date_time INTEGER PRIMARY KEY,
      price REAL NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  db.run(`
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
  `);

  db.run(`DROP TABLE ${tableName};`);
  db.run(`ALTER TABLE ${newTable} RENAME TO ${tableName};`);
}

export function getDb() {
  if (db) return db;

  dbPath = process.env.SQLITE_PATH || DEFAULT_DB_PATH;
  ensureDirForFile(dbPath);

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
  }

  db.run(`
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

  try {
    migrateGoldTable('gold_1d');
    migrateGoldTable('gold_30d');
  } catch {
    // Ignore migration errors.
  }

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_fetch_log_kind_time ON fetch_log(kind, fetched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fetch_log_kind_hash ON fetch_log(kind, payload_hash);

    CREATE INDEX IF NOT EXISTS idx_gold_1d_date_time ON gold_1d(date_time DESC);
    CREATE INDEX IF NOT EXISTS idx_gold_30d_date_time ON gold_30d(date_time DESC);
    CREATE INDEX IF NOT EXISTS idx_gold_1d_updated_at ON gold_1d(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_gold_30d_updated_at ON gold_30d(updated_at DESC);
  `);

  persist();
  return db;
}

export function dbRun(sql, params = []) {
  getDb();
  db.run(sql, params);
}

export function persistDb() {
  getDb();
  persist();
}

export function dbAll(sql, params = []) {
  getDb();
  return execAll(sql, params);
}
