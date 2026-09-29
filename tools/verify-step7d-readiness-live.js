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

try {
  const [roles, students, finance, inquiries, documents, reports] = await Promise.all([
    pool.query("SELECT role::text,status::text,count(*)::int AS count,count(*) FILTER(WHERE student_record_id IS NOT NULL)::int AS linked_students FROM app_users GROUP BY role,status ORDER BY role,status"),
    pool.query("SELECT status::text,count(*)::int AS count FROM students GROUP BY status ORDER BY status"),
    pool.query(`SELECT
      count(*)::int AS student_count,
      coalesce(sum(total_fee_paise),0)::bigint AS total_fee_paise,
      coalesce(sum(paid_paise),0)::bigint AS student_paid_snapshot_paise,
      coalesce((SELECT sum(amount_paise) FROM payments WHERE status='posted'),0)::bigint AS posted_payment_paise,
      coalesce((SELECT sum(amount_paise) FROM admission_installments),0)::bigint AS installment_plan_paise,
      count(*) FILTER(WHERE total_fee_paise<paid_paise)::int AS overpaid_students
      FROM students`),
    pool.query("SELECT status::text,count(*)::int AS count FROM inquiries GROUP BY status ORDER BY status"),
    pool.query(`SELECT
      (SELECT count(*)::int FROM certificates) AS certificates,
      (SELECT count(*)::int FROM id_card_issues) AS id_cards,
      (SELECT count(*)::int FROM admin_notices) AS notices,
      (SELECT count(*)::int FROM admin_notice_recipients) AS notice_recipients`),
    pool.query(`SELECT
      (SELECT count(*)::int FROM payments WHERE status='posted') AS posted_payments,
      (SELECT count(*)::int FROM payments WHERE status='reversed') AS reversed_payments,
      (SELECT count(*)::int FROM expenses WHERE status='posted') AS posted_expenses,
      (SELECT count(*)::int FROM staff_salaries WHERE status<>'void') AS active_salary_rows`)
  ]);
  const f = finance.rows[0];
  console.log(JSON.stringify({
    mode: 'read-only-no-pii',
    roleAccounts: roles.rows,
    studentStatuses: students.rows,
    inquiryStatuses: inquiries.rows,
    finance: {
      studentCount: Number(f.student_count),
      totalFeePaise: Number(f.total_fee_paise),
      studentPaidSnapshotPaise: Number(f.student_paid_snapshot_paise),
      postedPaymentPaise: Number(f.posted_payment_paise),
      installmentPlanPaise: Number(f.installment_plan_paise),
      overpaidStudents: Number(f.overpaid_students),
      paidSnapshotMatchesLedger: Number(f.student_paid_snapshot_paise) === Number(f.posted_payment_paise)
    },
    documents: documents.rows[0],
    reportSources: reports.rows[0]
  }));
} finally {
  await pool.end();
}
