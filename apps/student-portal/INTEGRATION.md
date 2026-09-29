# Step 5 Student Portal — implementation and integration notes

Completed 11 September 2026 in K:\FMS WEB System. Synthetic preview only; no Step 6, production data, online payment, full Admin module or protected-project changes.

## Reused capabilities
Existing student login/session, activation/recovery, logout, GET /api/v1/students/me/summary, existing role definitions and security middleware. The browser formats integer paise using Intl.NumberFormat; it does not recalculate authoritative fees, dues or certificate eligibility. Summary response and underlying existing student totals are unchanged.

## New API boundaries
- GET /api/v1/students/me/portal — authenticated student-only extended snapshot. Ownership comes exclusively from session user.studentRecordId. Query/filter parameters are rejected. No privileged search API is called by the portal.
- POST /api/v1/students/me/notices/{noticeId}/read — own-audience lookup, same-origin and session CSRF checks, server read timestamp, idempotent acknowledgement and existing audit event interface. No browser ownership/body field is used. Synthetic read state survives requests until the server restarts.
- GET /api/v1/students/me/receipts/{receiptId}/document — authorized shell only. Own known receipt returns 501 DOCUMENT_PENDING; unknown/other-account receipt returns the same 404. No file path, document URL or blob is exposed.

OpenAPI adds these paths and references packages/contracts/student-portal.schema.json. Existing API response shapes are unchanged. Unsupported repository capabilities return a clear pending state (portal) or 501 (notice acknowledgement). PostgreSQL repository/schema/migrations are unchanged; production records never fall back to synthetic fixtures.

## Student features
Responsive sidebar/mobile menu; dashboard; read-only profile/course/batch; fee breakdown; custom cumulative installment schedule; posted payment history; receipt shell; dues; read/unread notices; certificate status; course/session-scoped assignment/project/practical resources; protected credentials placeholder; verified institute contact; logout and existing activation/recovery entry points. Loading, empty, invalid-login and API error states are included. Tables scroll inside their containers; print CSS covers rendered details.

## Synthetic fixtures and rule verification
Server-only student-portal-fixtures.js adds an explicit 2026-09-11 snapshot for the existing synthetic accounts. The first account retains net fee 1,800,000 paise, paid 750,000 and balance 1,050,000. Breakdown: 1,700,000 course + 200,000 Add ON - 100,000 discount. Posted payments reconcile to 750,000.

Its custom plan is 600,000 / 450,000 / 300,000 / 450,000 paise. September cumulative requirement is 1,050,000, so the 300,000 shortage carries into October's 600,000 cumulative remaining amount. Schedule remaining amounts are not to be added together. A separate fully-paid acceptance fixture has zero balance/current due and an empty due list. These are fixed reference snapshots, not a new equal-installment or live FMS calculation engine.

Certificate fixture payment gates use 40%, 50% and 60%. The first is met at the supplied paid/total amounts; the others are not. The payment gate is not a declaration of final eligibility. Completion/course-end/duplicate/manual issuance checks remain required and no certificate is issued. Main-course status remains not eligible because completion and full payment are pending. No domain/issuance workflow changed.

The second existing account receives separate notice/resource metadata for OFFICE-DEMO. Active first account and pending-activation second account statuses remain unchanged. Automated tests activate the second account only within disposable test repositories to verify isolation.

## Security behavior
No RBAC list, CSP, HSTS, cookie, origin, rate-limit or CSRF policy was weakened. Student page strings are escaped. Private records, CSRF and credentials are kept only in memory; logout/page exit clears rendered data. Full reload requires signing in again because the existing API issues CSRF at login. No new session-refresh mechanism was introduced.

One existing synthetic security discrepancy was corrected: successful activation/recovery now revokes that user's prior synthetic sessions, matching the already-implemented PostgreSQL behavior and documented recovery requirement. This is a security parity fix, not a change to FMS operational rules.

## Pending integrations
PostgreSQL extended student persistence/notice read acknowledgements; verified live profile/course details and safe photo handling; operational custom schedule/dues/certificate read projections; secure receipt generation and authorized downloads; protected learning-material attachments; secure certificate views; re-authentication and audited credential reveal. No passwords or masked fake secrets are returned. Activation/recovery delivery integration and PostgreSQL execution verification remain pre-existing pending work.

## Verification and preview
npm.cmd run check passed. npm.cmd test: 29 passed, 0 failed (17 existing + 12 Step 5). Separate Node syntax checks passed for both Student Portal JS files, the new route handler and fixture module. Tests cover ownership, staff/admin separation, fee/payment reconciliation, carry-forward, fully-paid fixture, read-only payments, CSRF/origin/audit notices, receipt isolation, certificate gates, scoped resources, recovery revocation, pending repository behavior and escaped views/contracts.

Browser verification used a separate synthetic server at http://127.0.0.1:3001 so the existing port-3000 process was not restarted. Verified login, dashboard, profile, custom installments, notices/read action, receipt pending error, support/account, logout/private DOM clearing, public home and Admin login. Mobile at 360px and tablet at 768px had no page overflow; mobile navigation collapsed after selection and wide tables scrolled within their container. Desktop dashboard was visually inspected. All page renderers were checked by the test suite.

Synthetic review login: STU-DEMO-001 / Student!123. Do not use these credentials outside synthetic development. Restart the existing port-3000 API process when choosing to switch that preview to the new backend code; its current process has the older routes loaded.

## Files
Created: apps/student-portal/views.js; apps/student-portal/INTEGRATION.md; services/api/src/student-portal-routes.js; services/api/src/repositories/student-portal-fixtures.js; packages/contracts/student-portal.schema.json; tests/student-portal.test.js.
Modified: apps/student-portal/index.html; apps/student-portal/styles.css; apps/student-portal/app.js; services/api/src/app-step3.js; services/api/src/repositories/synthetic-step3.js; packages/contracts/openapi.yaml; PROJECT-CURRENT-STATUS.md.

Existing FMS business logic changed: NO.
