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
