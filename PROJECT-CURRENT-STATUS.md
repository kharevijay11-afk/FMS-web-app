# FMS Web System --- Project Current Status

**Project Root:** `K:\FMS WEB System`\
**Status Date:** 24 September 2026\
**Current Milestone:** Step 6F complete in code, full regression verification, and live PostgreSQL migrations 012-014; restore apply remains a controlled maintenance operation\
**Primary Rule:** Existing FMS System business logic must remain
unchanged unless explicitly approved by the user.

------------------------------------------------------------------------

## 1. Project Purpose

Build a Full-Stack FMS Web System while preserving the existing FMS
System's operational logic and workflows.

The web system may improve or change: - User interface and responsive
design - Web routing and navigation - Public Website - Student Portal -
Admin Web Panel - API architecture - Authentication/security
implementation - Database technology and deployment architecture

The web system must NOT silently change existing FMS business rules.

------------------------------------------------------------------------

## 2. FMS Logic That Must Be Preserved

The existing FMS System remains the business-rule reference for:

-   Student and admission workflow
-   Course and session handling
-   Batch and batch-capacity logic
-   Fee structure and net payable fee
-   CVRU Add ON fee behavior
-   Discounts
-   Custom installment schedules
-   Paid / Due calculations
-   Partial-payment carry-forward
-   Due/reminder rules
-   Payment posting and receipt numbering
-   Payment permissions
-   Inquiry â†’ Admission conversion
-   Certificate eligibility and issuance rules
-   Main-course and CVRU Add ON certificate rules
-   Student notices and reminder history
-   Expenses and Profit/Loss
-   User roles and permissions
-   Audit responsibilities
-   Backup/restore responsibilities

**Conflict Rule:** If a proposed web feature conflicts with the existing
FMS logic, preserve the FMS logic and stop for approval before changing
the business rule.

------------------------------------------------------------------------

## 3. Existing Source Systems

The existing desktop/LAN systems are reference/protected systems.

Do not modify these projects unless the user explicitly asks:

-   `C:\Users\Office-1\Documents\CFM System`
-   `C:\Users\Office-1\Documents\FMS LAN System`

The new web project is independent:

-   `K:\FMS WEB System`

Do not connect the public browser directly to Electron IPC,
SQLite/SQLCipher, or the existing LAN HTTP server.

------------------------------------------------------------------------

## 4. Architecture Already Decided

Current web architecture is a dependency-light modular JavaScript
monorepo.

Logical structure:

``` text
FMS WEB System/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ public-web/
â”‚   â”œâ”€â”€ student-portal/
â”‚   â””â”€â”€ admin-web/
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ api/
â”‚   â””â”€â”€ sync-worker/
â”œâ”€â”€ packages/
â”‚   â”œâ”€â”€ contracts/
â”‚   â”œâ”€â”€ domain/
â”‚   â””â”€â”€ ui/
â”œâ”€â”€ infrastructure/
â”œâ”€â”€ docs/
â”œâ”€â”€ tests/
â”œâ”€â”€ package.json
â”œâ”€â”€ package-lock.json
â””â”€â”€ README.md
```

Current technology decisions: - Node.js 22+ - ES Modules - Built-in Node
HTTP server - HTML5 + CSS + browser ES modules - REST/JSON API under
`/api/v1` - OpenAPI 3.1 contract - PostgreSQL target persistence - `pg`
package for PostgreSQL - Node built-in test runner

------------------------------------------------------------------------

## 5. Work Completed

### Step 1 --- Audit and Architecture

Completed.

Existing FMS architecture, modules, roles, database model, IPC
capabilities, business rules, LAN architecture, and web migration risks
were documented.

### Step 2 --- Secure Web Foundation

Completed.

Implemented foundation includes: - Public Web application boundary -
Student Portal boundary - Admin Web boundary - API service - Shared
contracts/domain packages - RBAC - Secure session concept - CSRF
controls - Input validation - Rate limiting - Security headers -
Synthetic fixtures - OpenAPI contract - Automated tests

### Step 3 --- PostgreSQL and Identity Foundation

Completed in synthetic verification mode.

Delivered: - PostgreSQL repository layer - Versioned transactional
migrations - Migration checksums - Synthetic seed runner - Persistent
session design - Activation/recovery tokens - Password reset session
revocation - TOTP MFA for superadmin/admin - AES-256-GCM encrypted MFA
secrets - Immutable audit-event design - Admin inquiry
list/filter/status workflow - Read-only admin student search -
Student-owned summary - Updated OpenAPI contract

Previous verification recorded: - Node.js syntax checks passed - 10
automated tests passed - 0 failed - npm audit: 0 known vulnerabilities
at that milestone

------------------------------------------------------------------------

## 6. Current Limitation / Pending Verification

Step 3 was not fully verified against a live PostgreSQL test instance.

Pending: - PostgreSQL test database - `DATABASE_URL` - Migration
execution against PostgreSQL - Constraint verification - Seed
verification - Repository integration test - Migration failure/rollback
test - End-to-end PostgreSQL verification

No real FMS database integration has been approved or implemented yet.

No production deployment has been approved.

------------------------------------------------------------------------

## 7. Immediate Next Action

Before Step 4, verify the copied project at:

`K:\FMS WEB System`

Run from PowerShell / VS Code Terminal:

``` powershell
K:
cd "K:\FMS WEB System"
npm install
npm run check
npm test
npm start
```

Verify: - Public page opens - `/student` opens - `/admin` opens -
Existing tests pass - No missing source files after copying the project

Do not start large feature changes until this verification succeeds.

------------------------------------------------------------------------

## 8. Step 4 Direction

After project health verification and PostgreSQL test approval, continue
from the existing codebase instead of rebuilding from zero.

Step 4 should focus on controlled feature development, including: -
Public CREATE COMPUTER website - Existing website sections and dynamic
content - Inquiry integration - Student Portal expansion - Admin
workflows - Course/batch/student workflows - Fee/payment/receipt
workflows - Certificate workflows - Reports

Every module must use the existing FMS business logic as its
specification.

------------------------------------------------------------------------

## 9. Token-Saving / Codex Rules

Use these rules in every Codex session:

1.  Project root is `K:\FMS WEB System`.
2.  Read this status file first.
3.  Read architecture/status documentation before implementation when
    needed.
4.  Inspect only files relevant to the current task.
5.  Do not scan or regenerate the entire project without a specific
    reason.
6.  Do not modify unrelated working files.
7.  Reuse existing components, contracts, services, and domain rules.
8.  Return/update only changed files where practical.
9.  Do not scan `node_modules`.
10. Do not touch CFM System or FMS LAN System unless explicitly
    instructed.
11. Preserve existing FMS business logic.
12. Before changing a fee, installment, due, receipt, certificate,
    student, course, batch, role, audit, or backup rule, stop and obtain
    approval.
13. Run relevant checks/tests after each meaningful change.
14. Update this status file after every major completed milestone.

------------------------------------------------------------------------

## 10. Session Handover Format

At the end of each work session, append/update:

### Last Session

-   Date:
-   Goal:
-   Files changed:
-   Features completed:
-   Tests run:
-   Test result:
-   Errors/issues:
-   Database changes:
-   FMS logic changes: **None**, unless explicitly approved
-   Pending work:
-   Exact next step:

This file is the primary quick handover document for continuing the
project in a new ChatGPT/Codex session.


------------------------------------------------------------------------

## Step 4 Public Website â€” Last Session

- Date: 11 September 2026.
- Status: Step 4 public website implementation completed and verified in synthetic preview mode. This entry supersedes the older immediate-action/Step 4 direction above. Step 5 was not started.
- Project: K:\FMS WEB System. Existing project continued; no rebuild or backend architecture redesign.
- Modified: apps/public-web/index.html, apps/public-web/styles.css, apps/public-web/app.js, PROJECT-CURRENT-STATUS.md.
- Created: apps/public-web/content.js, apps/public-web/pages.js, apps/public-web/inquiry.js, apps/public-web/INTEGRATION.md, tests/public-web.test.js.
- Features: responsive header/monogram/navigation/footer, manual hero slider, announcement/admissions inquiry banner, course cards/details, About, Student Zone, notices, inquiry/contact forms, certificate verification shell, assignments/projects/practical layouts, categorized gallery with lazy images and accessible modal, sample testimonials, contact/address/phone/WhatsApp/Google Maps links, privacy and terms preview pages.
- Routing: public #/ routes reuse the existing / page. Existing /student and /admin retained. No second authentication system.
- Inquiry: existing POST /api/v1/inquiries and unchanged contract. Email/session/address are included in the existing 500-character message field. Combined-length validation, native required/email/mobile checks, consent, same-key retry, click suppression, draft continuity across public routes and explicit new-inquiry reset. Keys/drafts live in memory only.
- Tests run: npm.cmd run check; npm.cmd test; separate node --check for app.js, content.js, pages.js and inquiry.js.
- Test result: 17 passed, 0 failed (12 existing + 5 Step 4 tests). Includes actual HTTP static/security checks, server invalid-input rejection, unchanged contract mapping, route/link resolution, overlapping submission blocking, lost-response idempotent retry, and rate-limit retry key retention.
- Browser verification: /, /student and /admin opened correctly; mobile hamburger and hero controls worked; required fields and invalid mobile blocked submission; synthetic inquiry WEB-0001 confirmed (no real data); gallery filter, image loading, modal Escape and focus return passed; verification shell displayed pending without sending certificate data; contact inquiry draft continuity passed.
- Responsive verification: 360, 768, 1024 and 1440 pixel viewports had no horizontal overflow; checked home images reported no broken loads; browser console had no warnings/errors. Desktop/mobile home and tablet gallery visually inspected.
- Environment: npm.cmd was not initially in PATH; used C:\Program Files\nodejs in process PATH. Sandbox test-worker spawn EPERM was resolved with approved execution outside the sandbox. Existing synthetic server on port 3000 was reused and left running.
- Security changes: no security middleware/header/CSP/session/CSRF/origin/rate-limit/RBAC/audit changes. Public strings escaped and unsafe card links rejected. Existing idempotency backend retained. No external image libraries, unsafe download serving or map iframe added.
- Database changes: NONE. No migrations, production connections or real FMS data. One synthetic browser-test inquiry exists in the running development server's memory.
- Existing FMS business logic changed: NO.
- Protected projects: CFM System and FMS LAN System not modified. Student/Admin source files not modified.
- Pending: approved institute content/logo/history/facilities/hours, live course metadata, actual gallery images/reviews, verified CVRU result URL, final privacy/terms, public CMS projection, secure certificate lookup API and approved learning-material storage/download links. These have labelled fixtures or pending states. The reference website could not be retrieved in this session.
- Pre-existing pending work retained: disposable PostgreSQL integration verification; this Step 4 does not claim PostgreSQL or production readiness.
- Limit: in-memory inquiry retry state is discarded on reload; existing backend cross-tab/concurrent idempotency semantics were not changed.
- Exact next step: review the local public website and supply/approve verified institute content to replace labelled fixtures. Plan the outstanding secure integrations separately; do not start Step 5 or connect production data without a new instruction.

See apps/public-web/INTEGRATION.md for the public data boundaries and pending endpoint details.


------------------------------------------------------------------------

## Step 5 Student Portal â€” Last Session

- Completion date: 11 September 2026.
- Status: Step 5 Student Portal complete in synthetic preview mode. This entry supersedes the previous next-step instruction. Step 6 not started.
- Features: mobile-first student dashboard, read-only profile/course/batch/fees/custom installments/payment history, receipt shell, dues, notices with read acknowledgement, certificate status, scoped assignment/project/practical resources, protected credential placeholder, institute help/contact and existing account/recovery/logout flows.
- Reused: existing authentication/session/CSRF/origin middleware, GET /students/me/summary, repository boundaries and unchanged role definitions. No second authentication system.
- Created: apps/student-portal/views.js; apps/student-portal/INTEGRATION.md; services/api/src/student-portal-routes.js; services/api/src/repositories/student-portal-fixtures.js; packages/contracts/student-portal.schema.json; tests/student-portal.test.js.
- Modified: apps/student-portal/index.html; apps/student-portal/styles.css; apps/student-portal/app.js; services/api/src/app-step3.js; services/api/src/repositories/synthetic-step3.js; packages/contracts/openapi.yaml; PROJECT-CURRENT-STATUS.md.
- APIs added under /api/v1: GET /students/me/portal; POST /students/me/notices/{noticeId}/read; GET /students/me/receipts/{receiptId}/document (authorized pending shell). Ownership comes from the account/session mapping only. Existing summary response unchanged.
- Fixtures: server-only snapshot dated 2026-09-11 with fee breakdown, unequal custom plan, partial carry-forward, posted payments, own receipt metadata, notices, certificate payment gates and course/session-scoped resources for existing synthetic accounts. Separate fully-paid acceptance scenario. Existing summary amounts unchanged.
- Tests: npm.cmd run check passed; npm.cmd test passed with 29 tests, 0 failures (17 prior + 12 new). New JS modules passed separate node --check. Coverage includes cross-student denial, staff/admin separation, fee formula, carry-forward, fully paid zero due, read-only payments, notice authentication/CSRF/origin/audit, receipt ownership, certificate thresholds, resource scope and recovery revocation.
- Browser checks: synthetic student login/dashboard/profile; mobile menu; custom installment table; own notice read action; pending receipt error; help/account; logout clears rendered private data; /, /student and /admin open on the updated preview. Mobile 360px/tablet 768px had no page overflow; wide tables scroll within the container; desktop dashboard visually inspected.
- Security changes: added narrow ownership checks and CSRF-protected audited notice acknowledgement. Fixed synthetic activation/recovery session revocation to match the existing PostgreSQL implementation. No role/permission lists, CSP, HSTS, cookies, origin restrictions, validation or rate limits weakened. No credentials exposed or browser-storage persistence added.
- Database changes: NONE. PostgreSQL repository and migrations unchanged. No production database or real student data connected.
- Existing FMS business logic changed: NO. Financial/certificate UI consumes server snapshots and formats values; no new calculation or issuance engine introduced.
- Unchanged projects/apps: Public Website source, Admin Web source, CFM System and FMS LAN System.
- Pending: PostgreSQL extended records/notice persistence, live FMS-approved projections, safe photos, authorized receipt generation/downloads, resource attachments, secure certificate views, re-authentication/audited credential reveal, existing recovery delivery and PostgreSQL execution verification.
- Preview: http://127.0.0.1:3001/student. Separate synthetic server left running. Existing port-3000 process was not restarted and needs a restart to load the new API routes. Demo login is documented in apps/student-portal/INTEGRATION.md.
- Exact next step: review Step 5 with the synthetic account and approve the next narrowly scoped integration milestone. Do not start Step 6, online payments or production data integration without a new instruction.

Detailed handover: apps/student-portal/INTEGRATION.md.


---

## Step 6A â€” Last Session

- Completion date: 12 September 2026.
- Status: Admin Dashboard + Navigation + RBAC and approved role migration implemented and verified in synthetic mode. This entry supersedes older next-step instructions.
- Final active roles: admin, staff, student. Admin is highest privileged and receives former superadmin system:admin/audit:read permissions; MFA remains required. Staff restrictions and Student ownership remain intact.
- Dashboard: responsive shell, twelve Admin cards, read-only previews, quick actions, grouped permission-aware navigation and safe Step 6Bâ€“6F placeholders.
- APIs: GET /api/v1/admin/dashboard/summary, /admin/navigation and /admin/modules/{moduleId}; existing inquiry/student APIs reused.
- Database: 006_admin_role_migration.sql created; transactional and idempotent account migration/constraint. Preserves IDs, sessions and immutable audit history. NOT EXECUTED: no disposable PostgreSQL runtime/connection configured. PostgreSQL integration and rollback verification remain pending.
- Tests: npm.cmd run check passed; npm.cmd test: 37 passed, 0 failed; new module syntax checks passed. Existing fee/installment/certificate/ownership regressions pass.
- Browser: Admin MFA/login/dashboard/card placeholder/search/logout; Staff restricted menu; Student Admin denial; public / and /student open. 360/768/1024/1440px had no document horizontal overflow.
- Preview: http://127.0.0.1:3002/admin, synthetic server. Existing servers left unchanged.
- Files created/modified, route inventory, security, compatibility classification and limitations: apps/admin-web/INTEGRATION.md. Original changed files preserved under .step6a-backup.
- No Public Website or Student Portal source changes; no CFM/FMS LAN changes or production data connections.
- APPROVED BUSINESS-RULE CHANGE: superadmin removed from active Web roles and required permissions transferred to admin.
- All other existing FMS business logic changed: NO.
- Pending: PostgreSQL verification, real aggregate integration, Step 6Bâ€“6F modules and previous production-readiness gaps.
- Exact next step: Step 6B after owner approval; Step 6B was not started.


---

## Step 6B â€” Last Session (PARTIAL; NOT COMPLETE)

- Date: 12 September 2026.
- Implemented: Inquiry search/filter/pagination/detail/edit/status; Student search/filter/pagination/detail/profile edit; Admin-only mark-left with confirmation and history preservation; audit-safe updates; existing admission record listing.
- Shared roles/permissions unchanged: admin, staff, student. Superadmin was not reintroduced. Staff inquiry operations and read-only student access remain restricted; Student Admin access denied.
- Pending blocker: authoritative existing Student ID generator and admission required-field/course/session/batch/initial fee rules are absent from Web code. Owner clarification requested. No invented numbering or fee scheme. Admission creation/conversion return an explicit pending response without creating records.
- Added migration: 007_student_profile_fields.sql (nullable profile fields and read-filter index). Execution against PostgreSQL remains pending; no production data connected.
- Tests: npm.cmd run check passed; npm.cmd test: 49 passed, 0 failed. New modules syntax-checked. Prior public/student/dashboard/security/fee/certificate tests pass. Successful admission/conversion/capacity tests are not complete.
- Browser: inquiry filters/detail/save/status/audit; student profile save; mark-left confirmation/list; Staff read-only detail; admission pending page; public / and /student; mobile/tablet/desktop management layout.
- Preview: http://127.0.0.1:3003/admin, isolated synthetic examples.
- Full files/API/fixture/audit/database report: apps/admin-web/STEP-6B-STATUS.md. Backups: .step6b-backup.
- All existing FMS business logic changed: NO.
- Exact next action: obtain existing admission rules and complete Step 6B admission/conversion. Step 6C remains next only after full Step 6B completion and owner approval.


---

## Step 6B â€” Completed in Synthetic Mode (15 September 2026)

- Student ID/admission LAN source rules were read only from the approved three source files; FMS LAN System modified: NO.
- Inquiry conversion and new admission are implemented with `CC-` four-digit-minimum numbering, atomic inquiry linking, idempotency, capacity validation, defaults and installment initialization.
- PostgreSQL migration 008 and reference tables were applied to the dedicated Supabase project. Course and batch references remain intentionally empty until approved values are supplied.
- Tests: 59 passed, 0 failed. Step 6C remains out of scope pending owner approval.

---

## Step 6B â€” Live PostgreSQL Completion (21 September 2026)

- Status: Step 6B is complete. The dedicated `FMS web App` Supabase project is connected through the Session pooler and the local Web server runs against PostgreSQL.
- Database: seven non-synthetic migrations (001â€“004, 006â€“008) were applied. Migration 005 synthetic student seed was excluded. Three explicitly non-personal demo courses, three batches and three demo inquiries were configured. No FMS LAN production data was read or imported.
- Live verification: demo inquiry `INQ-DEMO-001` converted through the Web API to student `CC-0001`, with DCA course, Morning 08:00 batch and 12 initialized installments. Its inquiry linkage/status was retained. A second conversion returned `409 ALREADY_CONVERTED`; a student-ID search found exactly one student.
- Seed correction: PostgreSQL demo setup creates Admin and Staff accounts only. The invalid pre-created student account was removed because students must originate from the admission workflow.
- Tests: `npm.cmd run check` passed; `npm.cmd test` passed with 59 tests and 0 failures.
- FMS LAN System modified: NO. Existing FMS admission and Student ID logic preserved: YES. All other existing FMS business logic changed: NO.
- Exact next step: begin Step 6C only after owner instruction.

---

## Step 6C â€” Academic Management (in progress)

- Date: 21 September 2026.
- Implemented: Admin Course, Session and Batch pages plus protected admin APIs; Course active/inactive status, session date validation, batch capacity/available-seat calculation, optimistic versions and immutable audit events.
- FMS rules preserved: course name uniqueness; course codes may repeat; default batch capacity 15; capacity cannot be reduced below active enrollment; batch capacity is global per normalized batch time.
- Database: `009_academic_management.sql` applied successfully to the dedicated Supabase project. It adds non-destructive academic-session storage and status/version fields; it does not reassign students or alter admission fees/installments.
- Live API verification: created labelled non-personal records `STEP 6C ACADEMIC DEMO`, `Step 6C Demo Session`, and `Step 6C 19:00`; new batch reported 15 available seats.
- Tests: `npm.cmd test` 60 passed, 0 failed.
- Remaining: dashboard academic aggregates, OpenAPI additions, and any Courseâ†’Sessionâ†’Batch linkage are not implemented because the verified FMS source has no such relationship/data model. Do not invent a relationship or alter existing student/admission history.
- FMS LAN System modified: NO. Final roles remain admin, staff, student. Superadmin was not reintroduced.

---

## Step 6C — Academic Management Completion Handover (23 September 2026)

- Status: **COMPLETE**. The earlier "in progress" Step 6C entry is retained as history and is superseded by this handover.
- Goal completed: dashboard academic aggregates and the missing OpenAPI contract additions for the existing Course, Session and Batch management APIs.
- Files changed:
  - `services/api/src/admin-dashboard.js`
  - `services/api/src/repositories/postgres-academic.js`
  - `services/api/src/repositories/academic-synthetic.js`
  - `apps/admin-web/views.js`
  - `packages/contracts/openapi.yaml`
  - `tests/admin-dashboard.test.js`
  - `tests/openapi-contract.test.js`
  - `PROJECT-CURRENT-STATUS.md`
- Dashboard features: exact repository-level totals for total/active courses, total/active sessions and total/active batches; active Course and Session metric cards; batch summary continues to show global batch time, active enrollment, capacity and available seats.
- Relationship boundary: Course, Session and Batch remain independent records. Batch dashboard rows deliberately return an empty course field. No Course→Session→Batch relationship, assignment or inferred mapping was introduced.
- APIs documented in OpenAPI: `GET`/`POST /api/v1/admin/courses`, `GET`/`PATCH /api/v1/admin/courses/{recordId}`, equivalent Session endpoints, and equivalent Batch endpoints. The contract documents session-cookie authentication, CSRF on writes, pagination/filter bounds, validation schemas, version conflicts, immutable audit behavior and the capacity-below-enrollment restriction.
- Security/RBAC: unchanged. Academic APIs remain restricted to `system:admin`; write routes retain same-origin and CSRF enforcement; optimistic versions and immutable audit events are preserved. Active roles remain exactly admin, staff and student. Superadmin was not reintroduced.
- Database changes this completion session: **NONE**. Existing applied migration `009_academic_management.sql` remains unchanged. No production or FMS LAN data was connected, read or imported.
- Live PostgreSQL verification: a read-only aggregate check was attempted using the locally configured `.env.txt`, but that configuration resolved to local PostgreSQL on port 5432 and returned `ECONNREFUSED`. No query completed and no database state changed. The previously recorded successful application of migration 009 and live API verification remain the latest live evidence.
- Checks run: the package `check` command could not be invoked by name because `npm.cmd` is not installed/on PATH in this session. The exact JavaScript syntax checks represented by that command were run directly with the bundled Node.js runtime, plus syntax checks for all changed server modules; all passed.
- Tests run: full `node --test` suite after the final fix.
- Test result: **62 passed, 0 failed**. This includes the previous 60 tests plus dashboard aggregate and OpenAPI regression coverage.
- Fixed during verification: the first run exposed duplicate synthetic batch summary rows because the new repository snapshot and the old Step 6A fallback both contributed rows. The fallback now runs only for repositories without the Step 6C academic aggregate method. Final full suite passed.
- Existing student/admission history and fee/installment/certificate rules changed: **NO**.
- CFM System modified: **NO**. FMS LAN System modified: **NO**.
- Limitations: PostgreSQL financial/student dashboard aggregates outside the academic scope remain pending where already labelled; no relationship exists among Course, Session and Batch; live aggregate verification requires a reachable dedicated FMS Web App connection configuration.
- Exact next step: owner review/approval of Step 6C, then select the next narrowly scoped milestone. Do not invent academic relationships or connect/import FMS LAN or production data.
---

## Step 6D — Fee Management Completion Handover (23 September 2026)

- Status: **COMPLETE in code and synthetic verification; migration execution pending**.
- Audit baseline: Step 6C was complete. Existing admissions already stored fee totals and installment snapshots; Student Portal had read-only synthetic financial snapshots. Admin fee/installment/payment/due/receipt routes were placeholders and PostgreSQL had no payment ledger.
- Implemented: Admin fee collection, installments, payments, due list and receipts views; protected financial read APIs; positive/outstanding payment validation; unique receipt allocation; versioned payment correction; logical reversal instead of physical deletion; preserved payment revisions; immutable audit events; dues derived from stored installment/payment history with partial-payment carry-forward; fully paid records excluded from due lists; seven-day due-soon window and persistent overdue state.
- Historical safety: admission net payable and installment rows remain snapshots. Course master changes do not recalculate them. Receipt data is sourced from the recorded payment and receipt numbers remain unchanged on correction/reversal.
- RBAC/security: Admin-only payment create/edit/reversal; Staff retains read-only access through the existing Admin shell permission; same-origin and CSRF required for all mutations. Active roles remain admin, staff and student.
- Files added: `packages/domain/src/finance.js`, `services/api/src/finance-routes.js`, `services/api/src/repositories/finance-synthetic.js`, `services/api/src/repositories/postgres-finance.js`, `services/api/migrations/010_fee_management.sql`, `apps/admin-web/finance.js`, `tests/fee-management.test.js`.
- Files changed: `services/api/src/app-step3.js`, `services/api/src/repositories/synthetic-step3.js`, `services/api/src/repositories/postgres.js`, `apps/admin-web/app.js`, `packages/contracts/openapi.yaml`, `PROJECT-CURRENT-STATUS.md`.
- Database: migration 010 added payment ledger, unique receipt number, logical status/version fields and append-only payment revisions. **Not executed** against live PostgreSQL in this session.
- Checks/tests: bundled Node syntax checks and full `node --test` suite.
- Tests: full `node --test` suite passed: **65 passed, 0 failed** (62 prior regressions plus 3 Step 6D tests). Changed server and browser modules also passed direct Node syntax checks.
- Existing FMS business logic changed: **NO**. No production or FMS LAN data was read/imported. FMS LAN System and CFM System modified: **NO**.
- Genuine remaining gap: apply migration 010 to the approved dedicated FMS Web App PostgreSQL environment and perform live transaction/rollback verification. Printable PDF receipt styling is not introduced because no authoritative receipt layout was present in the allowed project sources; the receipt record/API is complete and historical.
---

## Step 6D — Final Gap Closure (23 September 2026)

- Migration 010 status: **APPLIED** unchanged to the configured dedicated Supabase PostgreSQL database and checksum-recorded in `schema_migrations`.
- Schema verified: payments, payment revisions, receipt sequence, indexes, foreign keys, positive amount/status/version constraints and unique receipt constraint.
- Live isolated verification used only documented demo student `CC-0001`. One labelled ₹1.00 payment (`FMS-2026-000001`) committed; no production record was changed or deleted.
- Commit/consistency: payment persisted, audit event matched it, installment total equalled saved net payable, and paid/outstanding reconciled.
- Rollback: rejected overpayment left payment, audit and idempotency counts unchanged. Duplicate receipt failed with PostgreSQL `23505` and rolled back.
- Duplicate protection: payment POST now requires a stable Idempotency-Key. Atomic same-key replay returns the original payment; changed-payload reuse is rejected using the existing idempotency table. Migration 010 was not altered.
- Printable receipt: `PENDING — authoritative FMS receipt format required`. Existing authorized receipt shell retained; no format or calculation invented.
- Regression: direct execution of the package check's exact Node syntax commands plus all changed-module syntax checks passed. Full suite: **65 passed, 0 failed**; Step 6B and Step 6C regressions passed.
- `npm.cmd run check`: npm.cmd is not installed/on PATH in this environment, so it could not be invoked by name; its exact underlying commands passed via the bundled Node runtime.
- Files changed for closure: `services/api/src/finance-routes.js`, `services/api/src/repositories/finance-synthetic.js`, `services/api/src/repositories/postgres-finance.js`, `tests/fee-management.test.js`, `packages/contracts/openapi.yaml`, `apps/admin-web/STEP-6D-STATUS.md`, `PROJECT-CURRENT-STATUS.md`.
- Existing FMS business logic changed: **NO**. FMS LAN System modified: **NO**. Student ID/admission logic changed: **NO**. Step 6E started: **NO**.
- Remaining blocker: authoritative printable receipt format only; this is not a fee/payment business-logic failure.

---

## Step 6E — Communications, Certificates, and ID Cards (24 September 2026)

- Status: **COMPLETE in code and synthetic verification; K: deployment and migration execution pending because the Codex environment cannot write to the K: volume.**
- Implemented: seven-day cumulative due reminders with carry-forward and fully-paid exclusion; saved reminder history; active/course/session/selected-student notices with recipient snapshots; main and CVRU add-on certificate eligibility/issuance; active-student ID-card issue records and print counters.
- Certificate rules: main requires completed course plus full payment; Data Entry 40%, MS Office 50%, Accounting/Tally 60%; no certificate issue date before course end.
- Controlled boundaries: WhatsApp is not invoked and remains `not-requested`; exact certificate/ID-card printable layouts remain pending authoritative formats. Recording an ID-card print changes history/count only.
- Security: Admin-only mutations, same-origin and CSRF enforcement, immutable audit events, transactional PostgreSQL repository writes. Roles remain admin, staff and student.
- Database: migration `011_communications_certificates_id_cards.sql` added in the verified local mirror; **not applied** to live PostgreSQL.
- Tests: focused Step 6E 6/6 passed; full suite **71 passed, 0 failed**. Changed modules passed direct syntax checks.
- FMS LAN System modified: **NO**. Existing fee/payment/admission/receipt rules changed: **NO**.
- Full file/API/rule report: `apps/admin-web/STEP-6E-STATUS.md`.
- Exact next step: deploy the verified changed-file bundle to `K:\FMS WEB System`, rerun the full suite there, then apply migration 011 to the approved dedicated database and perform live rollback/constraint checks.

---

## Step 6E — Live PostgreSQL Closure (24 September 2026)

- Status: **COMPLETE**. The earlier pending deployment/migration note is superseded by this closure.
- K: verification: changed server entry modules passed syntax checks and the full suite passed **71/71**, with 0 failures.
- Database: migration `011_communications_certificates_id_cards.sql` is present in `schema_migrations` with a 64-character checksum in the approved dedicated Supabase PostgreSQL database.
- Schema verification: `admin_notices`, `admin_notice_recipients`, `due_reminder_history`, `certificates`, and `id_card_issues` are present.
- Rollback verification: an isolated notice plus recipient was inserted inside a transaction and rolled back; persistent row delta was **0**.
- Constraint verification: a zero-value reminder was rejected with PostgreSQL check violation `23514`; its savepoint and outer transaction were rolled back.
- Verification utility added: `tools/verify-step6e-live.js`. It requires an explicitly injected approved `DATABASE_URL` and does not store credentials.
- First connection attempt used a stale saved credential and failed authentication (`28P01`) before any database mutation. The newer approved connection succeeded.
- Existing FMS LAN System modified: **NO**. Production/student business records changed: **NO**. WhatsApp delivery and authoritative certificate/ID-card print layouts remain controlled future integrations.

### Step 6E — Manual WhatsApp Link Addition (24 September 2026)

- Added credential-free `Open in WhatsApp` actions for a selected notice recipient and each eligible due-reminder row.
- Messages open through `https://wa.me/` with normalized Indian mobile numbers and URL-encoded pre-filled text. The operator must review and press Send manually.
- Opening WhatsApp does not claim delivery, mutate reminder history, or change the persisted `not-requested` WhatsApp status. Saving/recording history remains a separate explicit action.
- Automatic or background delivery remains out of scope and still requires an approved provider and policy.
- Verification: changed modules passed syntax checks; full suite passed **72/72**, with 0 failures.

---

## Step 6F - Expenses and Profit/Loss (28 September 2026)

- Status: **IN PROGRESS**. First Step 6F slice is complete in code and synthetic verification.
- Implemented Admin-only expense categories, expense entry/history/search/filter, sequential expense numbers, versioned corrections, logical void with revision/audit history, and date-range Profit/Loss using posted fee income minus posted expenses.
- Migration `012_expenses_profit_loss.sql` is ready. Its first live attempt failed transactionally because PostgreSQL does not accept an expression inside a table-level `UNIQUE` constraint. It was corrected to a case-insensitive unique expression index.
- No partial schema was committed by the failed transaction. A corrected live attempt was not authorized by the approval system; no workaround was attempted.
- Verification: full suite passed **76/76** before the syntax-only migration correction; focused Step 6F plus migration/OpenAPI suite passed **7/7** after correction.
- Full report: `apps/admin-web/STEP-6F-STATUS.md`.
- This pending note is superseded by the live PostgreSQL closure below. Remaining Step 6F slices are reports, salary and administration.

### Step 6F - Expenses Live PostgreSQL Closure (28 September 2026)

- Migration `012_expenses_profit_loss.sql` applied successfully to the approved dedicated Supabase database and was checksum-recorded.
- Verified tables: `expense_categories`, `expenses`, and `expense_revisions`.
- Constraint checks: case-insensitive duplicate category returned `23505`; zero-value expense returned `23514`.
- Rollback-only verification inserted a labelled category and expense inside a transaction, then rolled back. Persistent expense-row delta was **0**.
- Reusable live verifier added: `tools/verify-step6f-live.js`; credentials are injected through the environment and are not stored by the script.
- Next Step 6F slice: collection, due and student reports; then salary and administration.

### Step 6F - Reports Slice (28 September 2026)

- Status: **COMPLETE in code and synthetic verification**.
- Added read-only Daily Collection, Monthly Collection, Course-wise Collection, Due and Student Reports in the Admin UI and protected API.
- Daily/monthly/course collection includes posted payments only. Due reporting reuses existing cumulative installment/payment logic. Student reporting does not expose financial history.
- Permissions: financial reports are Admin-only; Staff may access only Student Reports through the existing `student:summary:read:any` permission.
- PostgreSQL course aggregation pre-aggregates payments per student before grouping by course, preventing student fee totals from being multiplied by payment-row count.
- Tests: focused reports **2/2 passed**; full suite **78/78 passed**.
- Database migration: none. Existing migration 012 remains applied and verified.
- Next Step 6F slice: Staff Salary, followed by Users/Audit/Settings/Backup.

### Step 6F - Staff Salary Slice (28 September 2026)

- Status: **COMPLETE in code and synthetic verification; migration 013 pending explicit live-database authorization**.
- Preserved CFM salary rules: actual calendar days for the selected month, half-day absences, rounded per-day deduction, advance deduction, paid-not-above-net validation, and pending/partial/paid status.
- Added Admin UI, protected salary APIs, `SAL-####` allocation, active Admin/Staff selection, search/filters, versioned corrections, immutable audit events and logical void with revision history.
- Migration `013_staff_salary.sql` adds paise-based salary records and revision history; it has not been applied to live PostgreSQL.
- Tests: focused salary/OpenAPI **6/6 passed**; full suite **81/81 passed**.
- Existing CFM/FMS LAN modified: **NO**. Existing fee/payment/expense rules changed: **NO**.
- Next: explicitly authorize migration 013 application and rollback/constraint verification, then continue Users/Audit/Settings/Backup.

### Step 6F - Staff Salary Live PostgreSQL Closure (28 September 2026)

- Migration `013_staff_salary.sql` applied successfully to the approved dedicated Supabase database and was checksum-recorded.
- Verified `staff_salaries` and `staff_salary_revisions` tables.
- A paid-above-net insert failed with expected PostgreSQL check violation `23514`.
- A labelled salary insert was executed inside an isolated transaction and rolled back; persistent salary-row delta was **0**.
- Reusable live verifier: `tools/verify-step6f-salary-live.js`. It stores no credentials.
- Next Step 6F slice: Users, Audit, Institute Settings and Backup/Restore.

### Step 6F - Administration Slice (28 September 2026)

- Status: **COMPLETE in code and synthetic verification; migration 014 pending explicit live-database authorization**.
- Users: sanitized list, pending Admin/Staff creation, activate/block control, self-lockout prevention and PostgreSQL session revocation on block. No passwords or MFA secrets are exposed.
- Audit: append-only read-only viewer with filters. Institute Settings: optimistic versioning, revision history and audit.
- Backup: downloadable credential-free logical JSON. Authentication secrets, sessions, tokens and idempotency records are excluded.
- Restore: validate-only by design. Applying a restore requires an explicitly approved maintenance window, pre-restore database snapshot, reconciliation and rollback workflow.
- Migration `014_administration.sql` adds versioned institute settings; it has not been applied live.
- Tests: focused administration/OpenAPI **6/6 passed**; full suite **84/84 passed**.
- Next: explicitly authorize migration 014 application and rollback/constraint verification. After that, Step 6F code scope is complete; restore apply remains a controlled operational workflow.

### Step 6F - Administration Live PostgreSQL Closure (28 September 2026)

- Migration `014_administration.sql` applied successfully to the approved dedicated Supabase database and was checksum-recorded.
- Verified `institute_settings` and `institute_settings_revisions`, including the singleton settings row.
- Invalid version `0` failed with expected PostgreSQL check violation `23514`.
- A labelled settings update was executed inside an isolated transaction and rolled back; persistent settings delta was **0**.
- Reusable verifier: `tools/verify-step6f-administration-live.js`; it stores no credentials.
- Step 6F code and database scope is **COMPLETE**. Full regression baseline remains **84/84 passed**.
- Restore apply is not an ordinary application feature: it remains a controlled maintenance operation requiring a fresh database snapshot, maintenance window, reconciliation and tested rollback.
