import { performance } from 'node:perf_hooks';
import { createSyntheticStep3Repository } from '../services/api/src/repositories/synthetic-step3.js';
import { createStep3App } from '../services/api/src/app-step3.js';
import { loadConfig } from '../services/api/src/config-step3.js';
import { totp } from '../services/api/src/lib/security-step3.js';

const stats = (samples, startedAt) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const pick = (p) => Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)].toFixed(2));
  const elapsedMs = performance.now() - startedAt;
  return { count: samples.length, elapsedMs: Number(elapsedMs.toFixed(2)), p50Ms: pick(0.5), p95Ms: pick(0.95), maxMs: pick(1), operationsPerSecond: Number((samples.length / (elapsedMs / 1000)).toFixed(2)) };
};
const run = async (jobs) => {
  const startedAt = performance.now();
  const samples = [];
  const results = await Promise.allSettled(jobs.map(async (job) => {
    const start = performance.now();
    try { return await job(); } finally { samples.push(performance.now() - start); }
  }));
  return { results, metrics: stats(samples, startedAt) };
};
const event = { actorUserId: 'usr-admin', actorRole: 'admin', requestId: 'step-7e', ipHash: 'load', outcome: 'success' };
const config = { ...loadConfig(), origin: 'http://127.0.0.1', port: 0 };
const repo = createSyntheticStep3Repository(config);

const admissions = await run(Array.from({ length: 50 }, (_, index) => async () => repo.admissionCreate({
  name: `Load Student ${index + 1}`, mobile: `98${String(index).padStart(8, '0')}`,
  courseId: 'office-demo', admissionDate: '2026-09-28'
}, { key: `step7e-admission-${index}`, event })));
const admitted = admissions.results.filter((item) => item.status === 'fulfilled').map((item) => item.value.student);
const admissionIds = new Set(admitted.map((item) => item.studentId));

const payments = await run(Array.from({ length: 100 }, (_, index) => async () => repo.financeCreatePayment(
  'student-demo-001', { amountPaise: 100, date: '2026-09-28', mode: 'Cash', reference: `LOAD-${index}` },
  event, `step7e-payment-${index}`
)));
const paid = payments.results.filter((item) => item.status === 'fulfilled').map((item) => item.value.payment);
const receiptIds = new Set(paid.map((item) => item.receiptNumber));

const editTarget = admitted[0];
const edits = await run(Array.from({ length: 20 }, (_, index) => async () => repo.managementUpdate(
  'students', editTarget.id, { name: `Concurrent Winner ${index}`, status: 'active' }, 1,
  { ...event, requestId: `step7e-edit-${index}`, action: 'STUDENT_EDIT', entityType: 'student', entityId: editTarget.id }
)));

const reportKinds = ['daily', 'monthly', 'course-wise', 'dues', 'students'];
const reports = await run(Array.from({ length: 250 }, (_, index) => async () => repo.report(reportKinds[index % reportKinds.length], {})));

const server = createStep3App(config, repo);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let adminResponse = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'admin@example.test', password: 'ChangeMe!123' }) });
let adminBody = await adminResponse.json();
adminResponse = await fetch(`${base}/api/v1/auth/mfa/verify`, { method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: adminBody.challengeId, code: totp('JBSWY3DPEHPK3PXP') }) });
const adminCookie = adminResponse.headers.get('set-cookie').split(';')[0];
const httpReports = await run(Array.from({ length: 100 }, (_, index) => async () => {
  const kind = reportKinds[index % reportKinds.length];
  const response = await fetch(`${base}/api/v1/admin/reports?kind=${encodeURIComponent(kind)}`, { headers: { Cookie: adminCookie } });
  if (response.status !== 200) throw new Error(`Report returned ${response.status}`);
  return response.status;
}));
const logins = await run(Array.from({ length: 8 }, () => async () => {
  const response = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { Origin: config.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'staff@example.test', password: 'ChangeMe!123' }) });
  if (response.status !== 200) throw new Error(`Login returned ${response.status}`);
  return response.status;
}));
await new Promise((resolve) => server.close(resolve));

const fulfilled = (items) => items.filter((item) => item.status === 'fulfilled').length;
const rejected = (items) => items.length - fulfilled(items);
const rateLimitedLogins = logins.results.filter((item) => item.status === 'rejected' && String(item.reason?.message).includes('429')).length;
const output = {
  environment: 'synthetic-isolated',
  scenarios: {
    admissions: { ...admissions.metrics, succeeded: fulfilled(admissions.results), failed: rejected(admissions.results), uniqueStudentIds: admissionIds.size },
    payments: { ...payments.metrics, succeeded: fulfilled(payments.results), failed: rejected(payments.results), uniqueReceipts: receiptIds.size },
    optimisticEdits: { ...edits.metrics, succeeded: fulfilled(edits.results), conflicts: rejected(edits.results) },
    reports: { ...reports.metrics, succeeded: fulfilled(reports.results), failed: rejected(reports.results) },
    httpReports: { ...httpReports.metrics, succeeded: fulfilled(httpReports.results), failed: rejected(httpReports.results) },
    logins: { ...logins.metrics, succeeded: fulfilled(logins.results), rateLimited: rateLimitedLogins, unexpectedFailures: rejected(logins.results) - rateLimitedLogins }
  }
};
output.correctness = {
  admissionsNoDuplicates: admitted.length === 50 && admissionIds.size === 50,
  paymentsNoDuplicates: paid.length === 100 && receiptIds.size === 100,
  exactlyOneEditWinner: fulfilled(edits.results) === 1,
  reportsNoErrors: rejected(reports.results) === 0,
  httpReportsNoErrors: rejected(httpReports.results) === 0,
  loginPolicyEnforced: fulfilled(logins.results) + rateLimitedLogins === logins.results.length && rateLimitedLogins > 0
};
if (Object.values(output.correctness).some((value) => !value)) throw new Error(`Concurrency correctness failed: ${JSON.stringify(output)}`);
console.log(JSON.stringify(output));
