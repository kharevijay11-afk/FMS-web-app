import pg from 'pg';
import { performance } from 'node:perf_hooks';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' } : false,
  max: 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000
});
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];

try {
  const startedAt = performance.now();
  const timings = [];
  const results = await Promise.allSettled(Array.from({ length: 100 }, async (_, index) => {
    const start = performance.now();
    const result = await pool.query(`SELECT
      (SELECT count(*)::int FROM students) students,
      (SELECT coalesce(sum(amount_paise),0)::bigint FROM payments WHERE status='posted') collections,
      (SELECT count(*)::int FROM inquiries) inquiries,
      $1::int request_number`, [index]);
    timings.push(performance.now() - start);
    return result.rows[0];
  }));
  const elapsedMs = performance.now() - startedAt;
  const failed = results.filter((item) => item.status === 'rejected');
  const baselines = results.filter((item) => item.status === 'fulfilled').map((item) => JSON.stringify({ students: item.value.students, collections: item.value.collections, inquiries: item.value.inquiries }));
  const output = {
    environment: 'live-supabase-read-only', requests: results.length, succeeded: results.length - failed.length, failed: failed.length,
    elapsedMs: Number(elapsedMs.toFixed(2)), p50Ms: Number(percentile(timings, 0.5).toFixed(2)), p95Ms: Number(percentile(timings, 0.95).toFixed(2)), maxMs: Number(percentile(timings, 1).toFixed(2)),
    queriesPerSecond: Number((results.length / (elapsedMs / 1000)).toFixed(2)), poolMax: 10, peakPoolClients: pool.totalCount,
    consistentSnapshots: new Set(baselines).size === 1
  };
  if (failed.length || !output.consistentSnapshots) throw new Error(`Pool load failed: ${JSON.stringify(output)}`);
  console.log(JSON.stringify(output));
} finally {
  await pool.end();
}
