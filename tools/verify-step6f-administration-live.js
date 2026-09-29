import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' } : false, max: 1 });
const client = await pool.connect();

try {
  const migration = await client.query("SELECT checksum FROM schema_migrations WHERE version='014_administration.sql'");
  if (migration.rowCount !== 1 || migration.rows[0].checksum.length !== 64) throw new Error('Migration 014 is not checksum-recorded.');
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])", [['institute_settings', 'institute_settings_revisions']]);
  if (tables.rowCount !== 2) throw new Error('Administration settings tables are missing.');
  const before = await client.query('SELECT institute_name,version,updated_at FROM institute_settings WHERE id=true');
  if (before.rowCount !== 1) throw new Error('Singleton institute settings row is missing.');
  await client.query('BEGIN');
  await client.query("UPDATE institute_settings SET institute_name='STEP 6F ROLLBACK SETTINGS',version=version+1,updated_at=now() WHERE id=true");
  await client.query('SAVEPOINT invalid_version');
  let constraintCode = null;
  try { await client.query('UPDATE institute_settings SET version=0 WHERE id=true'); }
  catch (error) { constraintCode = error.code; await client.query('ROLLBACK TO SAVEPOINT invalid_version'); }
  if (constraintCode !== '23514') throw new Error(`Expected version check violation 23514, got ${constraintCode || 'none'}.`);
  await client.query('ROLLBACK');
  const after = await client.query('SELECT institute_name,version,updated_at FROM institute_settings WHERE id=true');
  if (after.rows[0].institute_name !== before.rows[0].institute_name || after.rows[0].version !== before.rows[0].version) throw new Error('Rollback changed institute settings.');
  console.log(JSON.stringify({ migration: 'recorded', tables: tables.rows.map((x) => x.table_name).sort(), singletonRows: after.rowCount, invalidVersion: constraintCode, persistentSettingsDelta: 0 }));
} finally {
  client.release();
  await pool.end();
}
