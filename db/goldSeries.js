import { getDb } from './sqlite.js';

function normalizePoint(point) {
  if (!point || typeof point !== 'object') return null;
  const dateTime = point.date_time ?? point.datetime ?? point.timestamp ?? point.time;
  const price = point.price;
  if (dateTime === undefined || price === undefined) return null;
  const dateTimeNumber = Number(dateTime);
  const priceNumber = Number(price);
  if (!Number.isFinite(dateTimeNumber) || !Number.isFinite(priceNumber)) return null;
  return { dateTime: dateTimeNumber, price: priceNumber };
}

export function upsertGoldSeries({ range, payload }) {
  if (range !== '1d' && range !== '30d') {
    throw new Error('upsertGoldSeries: range must be 1d or 30d');
  }
  if (!Array.isArray(payload)) {
    throw new Error('upsertGoldSeries: payload must be an array');
  }

  const table = range === '1d' ? 'gold_1d' : 'gold_30d';
  const db = getDb();
  const updatedAt = Date.now();

  const stmt = db.prepare(
    `INSERT INTO ${table} (date_time, price, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(date_time) DO UPDATE SET
       price = excluded.price,
       updated_at = excluded.updated_at`
  );

  const tx = db.transaction((points) => {
    for (const p of points) {
      const np = normalizePoint(p);
      if (!np) continue;
      stmt.run(np.dateTime, np.price, updatedAt);
    }
  });

  tx(payload);

  return { upsertedAttempted: payload.length };
}
