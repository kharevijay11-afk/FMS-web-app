# Step 6B — Inquiry, Admission and Student Management

Status date: 21 September 2026. **COMPLETE: PostgreSQL migration, demo setup and live admission verification completed.**

## LAN rules preserved

Read-only source files inspected from `K:\CODEX Softer_MAIN_File\FMS LAN System`:

- `database.js`
- `main.js`
- `index.html`

Student IDs use the configured prefix (the LAN default is `CC-`) plus a numeric counter padded to at least four digits: `CC-0001`. Before issuing an ID, the counter advances beyond the largest matching existing suffix, case-insensitively. IDs are never reused.

At admission, LAN creates a student with name, mobile, selected course, admission date, total course fee and status required by its UI. Defaults are Active status, the current date, a July session for the admission year, zero discount, and no CVRU add-on. Batch is optional. CVRU-only add-on/registration fields are cleared for non-CVRU courses. A non-empty fee creates a monthly installment plan based on the course duration; its plan total must equal net fee. Existing code uses a default batch capacity of 15 and counts active students across courses sharing the same normalized batch time.

The legacy UI copies inquiry name, mobile, guardian, course and notes into an admission, then marks the inquiry Converted and saves the linked student ID. Its conversion guard is UI-only. The Web implementation makes this atomic and idempotent to prevent a duplicate student on concurrent/retried requests. No payment, receipt, account, certificate or production student data is created or imported.

Unresolved: the LAN defaults are confirmed, but its live configured prefix, current counter, course list, duration/fee data and custom batch capacities are database settings. Those values were deliberately not read under the limited source-only exception. Configure them in the Web PostgreSQL admission reference tables before production use.

## Implemented behavior

- Inquiry search, filter, pagination, detail, edit/status and immutable audit history.
- New admission and Inquiry → Admission form for Admin only.
- Server-side ID allocation, capacity validation, inquiry linkage, ID generation, default session, CVRU handling and installment initialization.
- Request idempotency key plus serialized synthetic workflow; replay returns the original student while changed reuse fails.
- Duplicate conversion, stale inquiry version and full batch reject without creating a student or consuming a number.
- Student search/filter/detail, limited contact edits and mark-left, with existing fee/payment/receipt/certificate history preserved.
- Admin / Staff / Student permissions remain unchanged. Superadmin was not reintroduced.

## APIs

- `GET /api/v1/admin/admissions/setup` returns configured courses and batches for the form.
- `POST /api/v1/admin/admissions` creates an admission. It requires Admin, CSRF, same origin and `Idempotency-Key`.
- `POST /api/v1/admin/inquiries/{recordId}/convert` creates one linked admission under the same safeguards.
- Existing inquiry/student list, detail, edit and mark-left routes remain available.

## Database

`008_admission_workflow.sql` adds admission numbering, empty course/batch reference tables, student admission details, inquiry linkage, installment rows and replay records. It does not import LAN data or create payment/certificate/account records.

Migration execution: **applied on 19 September 2026** to the dedicated Supabase project `FMS web App`. Seven non-synthetic migrations (001–004, 006–008) were applied and recorded. Migration 005 synthetic seed was intentionally excluded; no FMS LAN student data was imported. Three clearly labelled, non-personal demo courses, batches and inquiries were then configured for live workflow verification.

## Verification

- `npm.cmd run check`: passed.
- `npm.cmd test`: **59 passed, 0 failed**.
- Tests cover numbering, session defaults, CVRU/add-on rules, installment rounding/month-end dates, invalid input, idempotent and concurrent conversion, audit rollback, cross-course batch capacity, mark-left seat release, linkage/history and existing student/portal preservation.
- Synthetic HTTP test covers Admin authorization, CSRF, staff denial, validation, replay and duplicate conversion.
- Live PostgreSQL/API verification on 21 September 2026: `INQ-DEMO-001` converted successfully to `CC-0001`; its course was DCA, batch was Morning 08:00, 12 monthly installments were initialized, and the inquiry changed to `converted` with its linked student record stored.
- A second live conversion request for that same inquiry was rejected with `409 ALREADY_CONVERTED`; a Student ID search returned exactly one matching student.

## Files changed

- `packages/domain/src/admission.js`
- `services/api/src/admin-management-routes.js`
- `services/api/src/repositories/synthetic-management.js`
- `services/api/src/repositories/postgres-admission.js`
- `services/api/src/repositories/postgres-management.js`
- `services/api/src/repositories/postgres.js`
- `services/api/migrations/008_admission_workflow.sql`
- `apps/admin-web/admission-form.js`
- `apps/admin-web/management.js`
- `tests/admission.test.js`, `tests/admin-management.test.js`, `tests/openapi-contract.test.js`
- `packages/contracts/openapi.yaml`, project status/documentation.

"FMS LAN System modified: NO"

"Existing FMS admission and Student ID logic preserved: YES"

"All other existing FMS business logic changed: NO"

"Final active roles remain: admin, staff, student."

"Superadmin was not reintroduced."

## Supabase demo configuration

On 19 September 2026, the dedicated `FMS web App` Supabase project received non-personal Step 6B demo references: three courses (DCA, Office & Data Skills, CVRU), three batches (Morning, Afternoon, Evening), and three synthetic inquiries (new, contacted, closed). One student now exists because `INQ-DEMO-001` was intentionally converted through the Web admission API during live verification. No FMS LAN production record was imported.
