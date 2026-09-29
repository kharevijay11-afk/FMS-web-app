import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' } : false, max: 1 });
const client = await pool.connect();

try {
  const migration = await client.query("SELECT checksum FROM schema_migrations WHERE version='012_expenses_profit_loss.sql'");
  if (migration.rowCount !== 1 || migration.rows[0].checksum.length !== 64) throw new Error('Migration 012 is not checksum-recorded.');
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])", [['expense_categories', 'expenses', 'expense_revisions']]);
  if (tables.rowCount !== 3) throw new Error('Step 6F tables are missing.');
  const before = await client.query('SELECT count(*)::int n FROM expenses');
  await client.query('BEGIN');
  const category = await client.query("INSERT INTO expense_categories(name) VALUES('STEP 6F ROLLBACK CATEGORY') RETURNING id");
  await client.query('SAVEPOINT duplicate_category');
  let duplicateCode = null;
  try { await client.query("INSERT INTO expense_categories(name) VALUES('step 6f rollback category')"); } catch (error) { duplicateCode = error.code; await client.query('ROLLBACK TO SAVEPOINT duplicate_category'); }
  if (duplicateCode !== '23505') throw new Error(`Expected duplicate violation 23505, got ${duplicateCode || 'none'}.`);
  const actor = await client.query("SELECT id FROM app_users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1");
  if (!actor.rowCount) throw new Error('No active admin exists for verification.');
  await client.query("INSERT INTO expenses(expense_number,category_id,expense_date,title,amount_paise,payment_mode,created_by) VALUES('STEP6F-ROLLBACK',$1,current_date,'Rollback verification',100,'Cash',$2)", [category.rows[0].id, actor.rows[0].id]);
  await client.query('SAVEPOINT invalid_amount');
  let amountCode = null;
  try { await client.query("INSERT INTO expenses(expense_number,category_id,expense_date,title,amount_paise,payment_mode) VALUES('STEP6F-INVALID',$1,current_date,'Invalid amount',0,'Cash')", [category.rows[0].id]); } catch (error) { amountCode = error.code; await client.query('ROLLBACK TO SAVEPOINT invalid_amount'); }
  if (amountCode !== '23514') throw new Error(`Expected check violation 23514, got ${amountCode || 'none'}.`);
  await client.query('ROLLBACK');
  const after = await client.query('SELECT count(*)::int n FROM expenses');
  if (after.rows[0].n !== before.rows[0].n) throw new Error('Rollback left persistent expense rows.');
  console.log(JSON.stringify({ migration: 'recorded', tables: tables.rows.map((x) => x.table_name).sort(), duplicateCategory: duplicateCode, invalidAmount: amountCode, persistentRowDelta: after.rows[0].n - before.rows[0].n }));
} finally {
  client.release();
  await pool.end();
}
