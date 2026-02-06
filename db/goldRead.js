import { dbAll, queueDbOp } from './sqlite.js';

export function readGoldSeries(range) {
  if (range !== '1d' && range !== '30d') {
    throw new Error('readGoldSeries: range must be 1d or 30d');
  }

  const table = range === '1d' ? 'gold_1d' : 'gold_30d';
  // date_time from upstream is epoch milliseconds (~13 digits). Filter out accidental/test data.
  const minEpochMs = 946684800000; // 2000-01-01
  return queueDbOp(() =>
    dbAll(`SELECT date_time, price FROM ${table} WHERE date_time >= ? ORDER BY date_time ASC`, [minEpochMs])
  );
}

export function readGoldSeriesSince(range, sinceMs) {
  if (range !== '1d' && range !== '30d') {
    throw new Error('readGoldSeriesSince: range must be 1d or 30d');
  }

  const table = range === '1d' ? 'gold_1d' : 'gold_30d';
  const minEpochMs = 946684800000; // 2000-01-01
  const since = Number(sinceMs);
  const floor = Number.isFinite(since) ? Math.max(minEpochMs, since) : minEpochMs;

  return queueDbOp(() =>
    dbAll(`SELECT date_time, price FROM ${table} WHERE date_time >= ? ORDER BY date_time ASC`, [floor])
  );
}

export function readGoldSeriesRecentHours(range, hours = 24) {
  const h = Number(hours);
  const safeHours = Number.isFinite(h) ? Math.max(1, Math.min(24 * 30, Math.floor(h))) : 24;
  const since = Date.now() - safeHours * 60 * 60 * 1000;
  return readGoldSeriesSince(range, since);
}
