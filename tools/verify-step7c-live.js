import pg from 'pg';
import { createHash } from 'node:crypto';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' }
    : false,
  max: 1
});
const client = await pool.connect();
const tables = ['students', 'inquiries', 'payments', 'admission_installments', 'admin_notices', 'admin_notice_recipients', 'certificates', 'id_card_issues', 'expenses', 'staff_salaries', 'app_users', 'audit_events'];

async function counts() {
  const output = {};
  for (const table of tables) output[table] = Number((await client.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count);
  return output;
}

try {
  const beforeCounts = await counts();
  const beforeSettings = (await client.query('SELECT institute_name,version,updated_at FROM institute_settings WHERE id=true')).rows[0];
  const migrations = (await client.query('SELECT version,checksum FROM schema_migrations ORDER BY version')).rows;
  const manifestHash = createHash('sha256').update(JSON.stringify({ tables: beforeCounts, migrations })).digest('hex');

  await client.query('BEGIN');
  const changed = (await client.query("UPDATE institute_settings SET institute_name=institute_name||' [STEP7C-ROLLBACK]',version=version+1,updated_at=now() WHERE id=true RETURNING institute_name,version")).rows[0];
  if (changed.version !== beforeSettings.version + 1) throw new Error('Transactional change was not visible inside the drill.');
  await client.query('SAVEPOINT constraint_check');
  let constraintCode = null;
  try {
    await client.query('UPDATE institute_settings SET version=0 WHERE id=true');
  } catch (error) {
    constraintCode = error.code;
    await client.query('ROLLBACK TO SAVEPOINT constraint_check');
  }
  if (constraintCode !== '23514') throw new Error(`Expected constraint 23514, got ${constraintCode || 'none'}.`);
  await client.query('ROLLBACK');

  const afterCounts = await counts();
  const afterSettings = (await client.query('SELECT institute_name,version,updated_at FROM institute_settings WHERE id=true')).rows[0];
  const settingsRestored = beforeSettings.institute_name === afterSettings.institute_name
    && beforeSettings.version === afterSettings.version
    && String(beforeSettings.updated_at) === String(afterSettings.updated_at);
  const rowCountsRestored = JSON.stringify(beforeCounts) === JSON.stringify(afterCounts);
  if (!settingsRestored || !rowCountsRestored) throw new Error('Rollback reconciliation failed.');

  console.log(JSON.stringify({
    mode: 'transactional-rollback-no-persistent-write',
    manifestHash,
    migrationCount: migrations.length,
    tableCounts: afterCounts,
    constraintCode,
    settingsRestored,
    rowCountsRestored
  }));
} finally {
  client.release();
  await pool.end();
}
