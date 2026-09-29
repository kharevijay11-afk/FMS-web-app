import pg from 'pg';
import { createPostgresFinance } from '../services/api/src/repositories/postgres-finance.js';
import { createPostgresReports } from '../services/api/src/repositories/postgres-reports.js';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' }
    : false,
  max: 2
});

try {
  const finance = createPostgresFinance(pool);
  const reports = createPostgresReports(pool, finance);
  const [daily, monthly, courses, dues, students] = await Promise.all([
    reports.report('daily'), reports.report('monthly'), reports.report('course-wise'),
    reports.report('dues'), reports.report('students')
  ]);
  const dueRows = await finance.financeList('dues');
  console.log(JSON.stringify({
    mode: 'read-only-no-pii',
    reports: {
      daily: daily.summary,
      monthly: monthly.summary,
      courseWise: courses.summary,
      dues: dues.summary,
      students: students.summary
    },
    finance: {
      dueStudentCount: dueRows.length,
      totalFeePaise: dueRows.reduce((sum, row) => sum + row.totalPaise, 0),
      totalPaidPaise: dueRows.reduce((sum, row) => sum + row.paidPaise, 0),
      outstandingPaise: dueRows.reduce((sum, row) => sum + row.outstandingPaise, 0)
    },
    reconciliations: {
      dailyEqualsMonthly: daily.summary.amountPaise === monthly.summary.amountPaise,
      dailyEqualsCourseCollection: daily.summary.amountPaise === courses.summary.collectionPaise,
      dueReportEqualsFinance: dues.summary.outstandingPaise === dueRows.reduce((sum, row) => sum + row.outstandingPaise, 0),
      studentCountsAgree: students.summary.studentCount === courses.items.reduce((sum, row) => sum + row.studentCount, 0)
    }
  }));
} finally {
  await pool.end();
}
