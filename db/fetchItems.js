import crypto from 'node:crypto';
import { getDb } from './sqlite.js';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const keys = Object.keys(value).sort();
  const props = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${props.join(',')}}`;
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function normalizeItems(kind, payload) {
  if (kind === 'summary' && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const entries = Object.entries(payload);
    // Expecting: { autd, gc, xau }
    return entries.map(([key, value]) => ({ itemId: key, item: value }));
  }

  if (Array.isArray(payload)) {
    return payload.map((item, index) => {
      const itemId =
        item && typeof item === 'object' && (item.date_time ?? item.datetime ?? item.timestamp ?? item.time);
      return { itemId: String(itemId ?? index), item };
    });
  }

  if (payload && typeof payload === 'object') {
    return [{ itemId: '__root__', item: payload }];
  }

  return [{ itemId: '__value__', item: payload }];
}

export function recordFetchItems({ kind, url, httpStatus, payload }) {
  if (!kind) throw new Error('recordFetchItems: kind is required');

  const items = normalizeItems(kind, payload);
  const db = getDb();

  const insert = db.prepare(
    'INSERT OR IGNORE INTO fetch_item (kind, item_id, url, fetched_at, http_status, payload_hash, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const tx = db.transaction((rows) => {
    const fetchedAt = Date.now();
    for (const row of rows) {
      const payloadJson = stableStringify(row.item);
      const payloadHash = sha256Hex(payloadJson);
      insert.run(kind, row.itemId, url || null, fetchedAt, httpStatus ?? null, payloadHash, payloadJson);
    }
  });

  tx(items);

  return { insertedAttempted: items.length };
}
