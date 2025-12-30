import crypto from 'node:crypto';
import { getDb } from './sqlite.js';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const props = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${props.join(',')}}`;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function recordFetchIfChanged({ kind, url, httpStatus, payload }) {
  if (!kind) throw new Error('recordFetchIfChanged: kind is required');

  const payloadJson = stableStringify(payload);
  const payloadHash = sha256Hex(payloadJson);

  const db = getDb();
  const last = db
    .prepare('SELECT payload_hash FROM fetch_log WHERE kind = ? ORDER BY fetched_at DESC, id DESC LIMIT 1')
    .get(kind);

  if (last?.payload_hash === payloadHash) {
    return { recorded: false, payloadHash };
  }

  const fetchedAt = Date.now();
  db.prepare(
    'INSERT INTO fetch_log (kind, url, fetched_at, http_status, payload_hash, payload_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(kind, url || null, fetchedAt, httpStatus ?? null, payloadHash, payloadJson);

  return { recorded: true, payloadHash };
}
