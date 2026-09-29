import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' }
    : false,
  max: 1,
});

const migration = '011_communications_certificates_id_cards.sql';
const tables = ['admin_notices', 'admin_notice_recipients', 'due_reminder_history', 'certificates', 'id_card_issues'];
const client = await pool.connect();

try {
  const applied = await client.query(
    'SELECT version, checksum, applied_at FROM schema_migrations WHERE version=$1',
    [migration],
  );
  if (applied.rowCount !== 1) throw new Error(`${migration} is not recorded.`);

  const present = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name=ANY($1::text[])`,
    [tables],
  );
  if (present.rowCount !== tables.length) throw new Error('One or more Step 6E tables are missing.');

  const before = await client.query('SELECT count(*)::int AS count FROM admin_notices');
  await client.query('BEGIN');
  const student = await client.query("SELECT id FROM students WHERE status='active' ORDER BY id LIMIT 1");
  if (!student.rowCount) throw new Error('No active student is available for isolated verification.');
  const actor = await client.query("SELECT id FROM app_users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1");
  if (!actor.rowCount) throw new Error('No active admin is available for isolated verification.');

  const notice = await client.query(
    `INSERT INTO admin_notices
       (title,message,target_type,target_snapshot,recipient_count,created_by)
     VALUES($1,$2,'students',$3,1,$4) RETURNING id`,
    ['STEP 6E ROLLBACK CHECK', 'Temporary verification record; transaction is rolled back.',
      { studentIds: [student.rows[0].id] }, actor.rows[0].id],
  );
  await client.query(
    'INSERT INTO admin_notice_recipients(notice_id,student_id) VALUES($1,$2)',
    [notice.rows[0].id, student.rows[0].id],
  );

  await client.query('SAVEPOINT invalid_step6e_constraint');
  let constraintCode = null;
  try {
    await client.query(
      `INSERT INTO due_reminder_history
         (student_id,due_date,amount_paise,due_status,recorded_by)
       VALUES($1,current_date,0,'due-soon',$2)`,
      [student.rows[0].id, actor.rows[0].id],
    );
  } catch (error) {
    constraintCode = error.code;
    await client.query('ROLLBACK TO SAVEPOINT invalid_step6e_constraint');
  }
  if (constraintCode !== '23514') throw new Error(`Expected check violation 23514, got ${constraintCode || 'none'}.`);
  await client.query('ROLLBACK');

  const after = await client.query('SELECT count(*)::int AS count FROM admin_notices');
  if (after.rows[0].count !== before.rows[0].count) throw new Error('Rollback did not preserve notice count.');

  console.log(JSON.stringify({
    migration: 'recorded',
    checksumLength: applied.rows[0].checksum.length,
    tables: present.rows.map((row) => row.table_name).sort(),
    transactionInsert: 'rolled-back',
    constraintViolation: constraintCode,
    persistentRowDelta: after.rows[0].count - before.rows[0].count,
  }));
} finally {
  client.release();
  await pool.end();
}
