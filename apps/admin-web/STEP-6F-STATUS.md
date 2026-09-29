# Step 6F - Finance and Administration

Status: complete in code, synthetic verification, and live PostgreSQL verification. Restore application remains a separately controlled maintenance operation.

## Completed slice: Expenses and Profit/Loss

- Admin-only expense list, search and filters by date, category and payment mode.
- Default CFM categories: Rent, Salary, Electricity, Internet, Stationery and Maintenance.
- Case-insensitively unique custom categories.
- Positive expense amounts stored in paise; fields preserve date, title, payment mode, vendor, bill number and notes.
- Sequential `EXP-####` expense numbers.
- Versioned corrections with preserved revisions and immutable audit events.
- Logical void instead of physical deletion. Voided records remain in history and are excluded from expense totals and Profit/Loss.
- Profit/Loss is posted fee income minus posted expenses for the selected date range.
- Same-origin and CSRF enforcement on every mutation.
- OpenAPI paths added for expense list/create, category creation, correction, void and Profit/Loss.

## Verification

- Focused Step 6F and OpenAPI/migration tests: 7 passed, 0 failed after migration syntax correction.
- Full suite before that correction: 76 passed, 0 failed. The correction only replaces an invalid expression table constraint with an equivalent PostgreSQL unique expression index.
- The first migration attempt failed transactionally on PostgreSQL syntax and left no partial schema.
- Corrected migration 012 was applied to the approved dedicated Supabase database and checksum-recorded.
- Live verification confirmed `expense_categories`, `expenses`, and `expense_revisions`.
- Case-insensitive duplicate category insertion returned expected PostgreSQL `23505`; zero expense amount returned expected `23514`.
- Isolated category and expense inserts were rolled back; persistent expense-row delta was zero.
- Reusable verifier: `tools/verify-step6f-live.js`.

## Files

- `packages/domain/src/expenses.js`
- `services/api/src/expense-routes.js`
- `services/api/src/repositories/expenses-synthetic.js`
- `services/api/src/repositories/postgres-expenses.js`
- `services/api/migrations/012_expenses_profit_loss.sql`
- `apps/admin-web/expenses.js`
- `tests/step6f-expenses.test.js`
- Integration changes in the main app/repository/OpenAPI modules.

## Remaining controlled operation

- Restore application remains a controlled maintenance operation; UI supports validation only.

## Completed slice: Reports

- Read-only Daily Collection and Monthly Collection aggregates use posted payments only.
- Course-wise report exposes student count, posted collection and outstanding amount without inventing Course/Session/Batch relationships.
- Due report reuses stored installment/payment snapshots and existing carry-forward rules.
- Student report supports ID, name, course and batch search.
- Financial reports are Admin-only. Staff access remains limited to Student Reports under the existing permission matrix.
- Invalid date ranges and unknown report kinds are rejected; non-GET report requests return method-not-allowed.
- Focused report tests: 2 passed, 0 failed. Full suite: **78 passed, 0 failed**.

## Completed slice: Staff Salary

- Admin-only salary entry/history with active Admin/Staff selection and `SAL-####` numbering.
- Existing CFM calculation preserved: calendar days from salary month; per-day salary rounded to paise; half-day absence support; net salary = gross - absence deduction - advance; due = net - paid.
- Status is pending, partial or paid from paid/due values. Paid amount cannot exceed net salary.
- Month, staff, status and text filters; net/paid/due summaries.
- Corrections require the current version and preserve revisions. Void replaces physical deletion and preserves audit/history.
- Migration `013_staff_salary.sql` is applied and checksum-recorded in the approved dedicated Supabase database.
- Live verification confirmed `staff_salaries` and `staff_salary_revisions`; paid-above-net failed with expected `23514`; rollback left zero persistent salary rows.
- Reusable verifier: `tools/verify-step6f-salary-live.js`.
- Focused salary/OpenAPI tests: 6 passed, 0 failed. Full suite: **81 passed, 0 failed**.

## Completed slice: Administration

- Users: sanitized list; create pending Admin/Staff accounts; activate/block operational accounts; self-lockout prevention; blocking revokes active sessions in PostgreSQL. Credentials and MFA secrets are never returned.
- Audit: read-only append-only event viewer with search/outcome filters.
- Institute Settings: versioned name, address, phone, email and student/receipt prefixes with revision and immutable audit history.
- Backup: credential-free logical JSON export. Password hashes, MFA secrets, sessions, tokens and idempotency records are excluded.
- Restore: format validation only. Applying restore is deliberately unavailable until a maintenance window, pre-restore database snapshot, reconciliation and rollback procedure are explicitly approved.
- Migration `014_administration.sql` is applied and checksum-recorded in the approved dedicated Supabase database.
- Live verification confirmed `institute_settings` and `institute_settings_revisions`, exactly one settings row, expected version check violation `23514`, and zero persistent settings delta after rollback.
- Reusable verifier: `tools/verify-step6f-administration-live.js`.
- Focused administration/OpenAPI tests: 6 passed, 0 failed. Full suite: **84 passed, 0 failed**.

Existing FMS LAN/CFM System modified: NO. Existing admission, student, payment, receipt, certificate and ID-card rules changed: NO.
