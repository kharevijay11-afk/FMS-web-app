import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' } : false, max: 1 });
const client = await pool.connect();

try {
  const migration = await client.query("SELECT checksum FROM schema_migrations WHERE version='013_staff_salary.sql'");
  if (migration.rowCount !== 1 || migration.rows[0].checksum.length !== 64) throw new Error('Migration 013 is not checksum-recorded.');
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])", [['staff_salaries', 'staff_salary_revisions']]);
  if (tables.rowCount !== 2) throw new Error('Staff salary tables are missing.');
  const before = await client.query('SELECT count(*)::int n FROM staff_salaries');
  const staff = await client.query("SELECT id,display_name,role FROM app_users WHERE role IN('admin','staff') AND status='active' ORDER BY id LIMIT 1");
  if (!staff.rowCount) throw new Error('No active staff/admin user exists for verification.');
  await client.query('BEGIN');
  await client.query("INSERT INTO staff_salaries(salary_number,staff_user_id,staff_name,staff_role,salary_month,gross_paise,calendar_days,absent_days,advance_paise,net_paise,paid_paise,payment_date,payment_mode,status) VALUES('STEP6F-SALARY-ROLLBACK',$1,$2,$3,'2026-09',3000000,30,0.5,100000,2850000,1000000,current_date,'Cash','partial')", [staff.rows[0].id, staff.rows[0].display_name, staff.rows[0].role]);
  await client.query('SAVEPOINT invalid_paid');
  let constraintCode = null;
  try {
    await client.query("INSERT INTO staff_salaries(salary_number,staff_user_id,staff_name,staff_role,salary_month,gross_paise,calendar_days,absent_days,advance_paise,net_paise,paid_paise,payment_date,payment_mode,status) VALUES('STEP6F-SALARY-INVALID',$1,$2,$3,'2026-09',100000,30,0,0,100000,100001,current_date,'Cash','paid')", [staff.rows[0].id, staff.rows[0].display_name, staff.rows[0].role]);
  } catch (error) {
    constraintCode = error.code;
    await client.query('ROLLBACK TO SAVEPOINT invalid_paid');
  }
  if (constraintCode !== '23514') throw new Error(`Expected check violation 23514, got ${constraintCode || 'none'}.`);
  await client.query('ROLLBACK');
  const after = await client.query('SELECT count(*)::int n FROM staff_salaries');
  if (after.rows[0].n !== before.rows[0].n) throw new Error('Rollback left a persistent salary row.');
  console.log(JSON.stringify({ migration: 'recorded', tables: tables.rows.map((x) => x.table_name).sort(), paidAboveNet: constraintCode, persistentRowDelta: after.rows[0].n - before.rows[0].n }));
} finally {
  client.release();
  await pool.end();
}
