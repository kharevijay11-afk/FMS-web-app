import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' }
    : false,
  max: 1
});

const scalar = async (sql) => Number((await pool.query(sql)).rows[0].count);

try {
  const migrations = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  // 005 is an intentionally skipped development-only synthetic seed, not a production migration.
  const expected = Array.from({ length: 16 }, (_, index) => String(index + 1).padStart(3, '0'))
    .filter((version) => version !== '005');
  const applied = new Set(migrations.rows.map(({ version }) => version.slice(0, 3)));
  const counts = {};
  for (const table of ['students', 'inquiries', 'payments', 'admission_installments', 'admin_notices', 'certificates', 'id_card_issues']) {
    counts[table] = await scalar(`SELECT count(*)::int AS count FROM ${table}`);
  }
  const integrity = {
    orphanPayments: await scalar('SELECT count(*)::int AS count FROM payments p LEFT JOIN students s ON s.id=p.student_id WHERE s.id IS NULL'),
    orphanInstallments: await scalar('SELECT count(*)::int AS count FROM admission_installments i LEFT JOIN students s ON s.id=i.student_id WHERE s.id IS NULL'),
    orphanCertificates: await scalar('SELECT count(*)::int AS count FROM certificates c LEFT JOIN students s ON s.id=c.student_id WHERE s.id IS NULL'),
    orphanIdCards: await scalar('SELECT count(*)::int AS count FROM id_card_issues i LEFT JOIN students s ON s.id=i.student_id WHERE s.id IS NULL'),
    orphanNoticeRecipients: await scalar('SELECT count(*)::int AS count FROM admin_notice_recipients r LEFT JOIN admin_notices n ON n.id=r.notice_id LEFT JOIN students s ON s.id=r.student_id WHERE n.id IS NULL OR s.id IS NULL'),
    duplicateStudentIds: await scalar('SELECT count(*)::int AS count FROM (SELECT upper(student_id) FROM students GROUP BY upper(student_id) HAVING count(*)>1) d'),
    duplicateReceipts: await scalar('SELECT count(*)::int AS count FROM (SELECT receipt_number FROM payments GROUP BY receipt_number HAVING count(*)>1) d'),
    duplicateCertificates: await scalar('SELECT count(*)::int AS count FROM (SELECT certificate_number FROM certificates GROUP BY certificate_number HAVING count(*)>1) d')
  };
  console.log(JSON.stringify({
    mode: 'read-only',
    migrationCount: migrations.rowCount,
    missingMigrations: expected.filter((version) => !applied.has(version)),
    counts,
    integrity,
    integrityViolations: Object.values(integrity).reduce((sum, count) => sum + count, 0)
  }));
} finally {
  await pool.end();
}
