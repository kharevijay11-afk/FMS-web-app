> Current Web role model — 12 September 2026, Step 6A: admin, staff, student. Admin is the highest privileged role and receives required former superadmin permissions with MFA. Earlier role descriptions below are historical; do not reintroduce superadmin. Step 6A is verified in synthetic mode (37 tests pass); PostgreSQL migration execution remains pending. See apps/admin-web/INTEGRATION.md and PROJECT-CURRENT-STATUS.md for the latest status.

# FMS Web System Architecture

Status: Step 1 planning only  
Prepared: 9 September 2026  
Target: `C:\Users\Office-1\Documents\FMS Web System`  
Audited source: `C:\Users\Office-1\Documents\FMS LAN System` (read-only)

## Scope and guardrails

This document defines the proposed architecture and development sequence for a new web system. Step 1 creates no application code, database, migration, deployment, or integration process. The existing CFM and FMS LAN projects remain independent and unchanged.

The audit used `PROJECT_AI_HANDOVER.md`, `PROJECT_FILE_INDEX.json`, `PROJECT_DATABASE_SCHEMA_EXPORT.sql`, `package.json`, `LAN-SETUP-GUIDE.txt`, and targeted inspection of the LAN runtime/main-process integration points. The documentation describes `CFM System` as the primary desktop source and `FMS LAN System` as a separately maintained variant. Because both were explicitly protected, neither is a development target for this plan.

## 1. Existing FMS architecture summary

### Runtime and data flow

The existing product is an offline-first Electron desktop application. The principal flow is:

`index.html renderer` → `preload.js / window.cfm` → Electron IPC handlers in `main.js` → `database.js` → encrypted SQLite.

- `index.html` is a large monolithic renderer containing views, styles, form logic, calculations, reports, print layouts, and WhatsApp templates.
- `main.js` owns the Electron lifecycle, sessions, IPC authorization, database calls, printing/PDF windows, backup/restore, phone integration, and update hooks.
- `preload.js` exposes a restricted bridge while Electron uses `contextIsolation: true` and `nodeIntegration: false`.
- `renderer-data-adapter.js` provides compatibility between legacy renderer calls and the database-backed APIs.
- `database.js` is the synchronous SQLite/SQLCipher data-access and business-operation layer.
- `holiday-leave-module.js` and `staff-salary-module.js` are removable feature modules; most other behavior remains in the renderer monolith.
- The canonical local schema is `database/schema.sql`. The default database is under application data; the source documentation also records SQLCipher support and a protected key.

### LAN variant

The LAN variant supports standalone, admin-host, and staff-client modes. An admin host retains the database and starts an HTTP service on port 47821; clients proxy selected IPC channels to it using a LAN security key. The host must remain open and machines must share the same private network. This is a trusted-LAN transport, not a production public-web API, and must not be exposed directly to the internet.

### Roles and permissions

- `superadmin`: hidden master role with full configuration, user, backup, tool, edit, and delete access.
- `admin`: operational administration and most edit/delete actions, excluding superadmin-only controls.
- `staff`: operational access to inquiries, students, fees, certificates, notices, batch display, and limited tools; sensitive edit/delete controls are restricted.
- `student`: access only to the student's own dashboard and data.

Current student authentication uses Student ID plus the lowercase first word of the student's name. This is predictable and must not be carried into the internet-facing system.

### Main modules

The system covers dashboard reporting; inquiry/follow-up and admission conversion; active/left students; courses, sessions, and batch capacity; admission and installment plans; fee collection, upgrades, receipts, daily collection, dues, and reminders; student notices; credentials import; ID cards; certificate eligibility/issuance/history; expenses and profit/loss; staff salaries; holidays/leaves; user access; audit logs; backup/restore; PDF/printing; WhatsApp messaging; and calling helpers.

### Database model

The exported schema contains 24 operational/support tables:

- Identity/configuration: `users`, `institute_settings`, `app_meta`, `counters`.
- Academic/student: `courses`, `students`, `student_installments`, `batch_capacities`, `student_credentials`.
- Money: `payments`, `expense_categories`, `expenses`, `staff_salaries`.
- Documents/communication: `certificates`, `id_cards`, `generated_documents`, `student_notices`, `due_reminder_history`, `holiday_leaves`.
- Workflow/operations: `inquiries`, `backup_history`, `print_jobs`, `print_job_items`, `cloud_sync_runs`, `audit_logs`.

Foreign keys link payments, installments, credentials, notices, certificates, ID cards, inquiries, expenses, and audit data to students/users where appropriate. Text dates and monetary `REAL` columns are desktop-era decisions that should be normalized for a networked web database (UTC timestamps and fixed-precision numeric/paise values) during a later migration design—not in Step 1.

### Core business rules that must be preserved

- Student net payable fee = course fee + CVRU Add ON fee − discount.
- CVRU-only fields and Add ON behavior depend on the selected course group/code.
- Custom installment schedules drive cumulative due calculations; partial underpayment carries forward, and fully paid students leave due lists.
- Automatic reminders begin seven days before due date and retain overdue items until resolved.
- Payment amount must be positive; receipt number is unique; payment edit/delete is privileged.
- Main-course certificates require completion/full-fee conditions. CVRU Add ON certificates are manually issued after payment reaches 40% (Data Entry), 50% (MS Office), and 60% (Accounting with Tally Prime), with duplicate and course-end-date checks.
- Batch capacity defaults to 15 and full batches are unavailable for new admission selection.
- Inquiry can convert to admission; notices/reminders retain delivery history.
- Profit/loss is fee income minus expenses.
- Audit and backup responsibilities are cross-cutting and must survive the web transition.

### Existing API surface

The existing interface is IPC rather than HTTP. Its groups include authentication, settings, bootstrap/import, users, courses, batches, students, credentials, notices, holidays, salaries, inquiries, payments, ID cards, certificates, reminders, backup/maintenance, documents/printing, expenses/reports, audit, dialogs, phone integration, and updates. This is a useful capability inventory, but payloads and authorization behavior must be explicitly redesigned for web use.

## 2. Web System architecture

Use a modular monorepo with independently deployable web clients and a single authoritative backend API initially. A modular monolith is preferred for Step 2 because it preserves transaction boundaries and reduces distributed-system risk while retaining clean domains that could later be separated.

Proposed logical layout:

```text
FMS Web System/
├── apps/
│   ├── public-web/          Public marketing and inquiry site
│   ├── student-portal/      Authenticated student experience
│   └── admin-web/           Superadmin/admin/staff operations
├── services/
│   ├── api/                 Authoritative HTTP API and domain modules
│   └── sync-worker/         Future desktop/web synchronization jobs
├── packages/
│   ├── contracts/           Shared request/response schemas and types
│   ├── domain/              Framework-independent business rules
│   └── ui/                  Shared design system components/tokens
├── infrastructure/         Deployment/IaC/container plans (later)
├── docs/                   ADRs, API and operational documentation
└── tests/                  Cross-application integration/e2e tests
```

Recommended initial production topology:

- CDN/static hosting for public and authenticated frontend bundles.
- TLS-terminated reverse proxy/API gateway.
- Stateless backend instances with server-side authorization.
- Managed PostgreSQL as the future web system of record.
- Object storage for student photos, logos, receipts, certificates, and exports; database stores metadata and object keys, not large base64 values.
- Queue-backed worker for notifications, document generation, imports, and future sync.
- Central logs, metrics, tracing, alerting, encrypted backups, and recovery drills.

No database selection is implemented or migrated in Step 1. PostgreSQL is a recommendation for Step 2 design validation.

## 3. Required frontend/backend/API structure

### Frontend boundaries

Each frontend should have routes, feature modules, API client, auth/session handling, validation, accessibility, error boundaries, analytics/telemetry hooks, and tests. Shared UI code belongs in `packages/ui`; business invariants must not exist only in browser code.

- Public routes: home, institute/about, courses, admissions information, contact, inquiry submission, policies.
- Student routes: sign-in/recovery, dashboard, profile, course/batch, fee ledger/installments/dues, receipt download, notices, certificates, credentials, support.
- Admin routes: dashboards, inquiries, admissions/students, fees/payments/receipts, reminders/notices, courses/batches, certificates/ID cards, finance/reports, staff/tools, settings/users/audit/sync.

### Backend modules

Create bounded modules for identity/access, institute/tenancy, inquiries, students/admissions, courses/batches, fees/installments/payments, communications, certificates/documents, expenses/finance, staff, reporting, audit, media, imports/exports, and integration/sync. Each module should separate transport controllers, application services/use cases, domain rules, and repositories.

### API conventions

- Versioned JSON API under `/api/v1`; publish an OpenAPI contract.
- Resource-oriented endpoints plus explicit command endpoints for business transitions such as inquiry conversion, payment posting/reversal, certificate issuance, and sync acknowledgement.
- Pagination, filtering, sorting, consistent error envelopes, correlation IDs, and UTC ISO-8601 timestamps.
- Request/response validation from shared schemas; never trust client calculations.
- Optimistic concurrency using row version/updated-at preconditions for mutable records.
- Idempotency keys for payments, inquiry submissions, sync ingestion, and notification jobs.
- Server-generated immutable identifiers; human-facing student/receipt/certificate numbers remain separate unique fields.
- Fine-grained authorization at every handler and object-level ownership checks for students.
- Soft-delete/status transitions where records have financial, certificate, or audit importance; append-only correction/reversal for posted financial entries.

Initial capability groups should map the existing IPC inventory without blindly copying it: `/auth`, `/me`, `/users`, `/settings`, `/courses`, `/batches`, `/inquiries`, `/students`, `/installments`, `/payments`, `/receipts`, `/notices`, `/reminders`, `/certificates`, `/id-cards`, `/expenses`, `/staff-salaries`, `/reports`, `/documents`, `/audit-events`, and `/integrations`.

## 4. FMS ↔ Web integration plan

Do not connect the browser to SQLite, Electron IPC, or the LAN HTTP server. Introduce an explicit integration boundary.

1. Establish record ownership for each phase. Until cutover, the desktop/LAN database remains authoritative for existing operations; the web begins read-only or with narrowly owned workflows.
2. Define canonical contracts and immutable global IDs. Maintain a mapping between desktop IDs/human numbers and web IDs.
3. Build a separate connector in a later step, outside protected source folders. Prefer signed outbound HTTPS from the institute network to the web API so no inbound public port is opened.
4. Bootstrap with a validated export snapshot, checksums, record counts, reconciliation totals, and a dry-run report. Never sync the raw encrypted database file as an operational protocol.
5. Use an outbox/change journal for incremental records and idempotent ingestion on the web. Each event needs source instance ID, event ID, entity, operation, source version, occurred-at time, and payload schema version.
6. Return acknowledgements/checkpoints; retain failed items in a retry/dead-letter queue. Expose sync health and reconciliation reports to superadmin.
7. Define conflict rules per entity before enabling bidirectional writes. Financial transactions and issued certificates should be append-only/corrected, not last-write-wins. Profile/settings conflicts may use explicit review or version checks.
8. Pilot read-only student data, then public inquiries, then controlled write workflows. Run parallel reconciliation before any system-of-record cutover.
9. Keep a rollback window and immutable source backups. Cut over module by module only after acceptance and restore tests.

## 5. Security plan

- Require TLS everywhere; use HSTS and secure headers/CSP. Never expose the current LAN server or key to the internet.
- Replace predictable student passwords with activation links/OTP and user-set passwords or passwordless OTP. Hash passwords with Argon2id (or a current equivalent), rate-limit authentication, and require MFA for superadmin/admin.
- Use short-lived, secure, HttpOnly, SameSite cookies with CSRF protection (or a carefully designed token flow); rotate sessions after login/privilege changes and support server-side revocation.
- Enforce role-based permissions plus object-level checks. Default deny. Preserve superadmin/admin/staff/student semantics while documenting a permission matrix; do not rely on hidden UI controls.
- Encrypt data in transit and at rest; store secrets in a managed secrets service; rotate keys and credentials. Separate production, staging, and development secrets/data.
- Minimize personal data, mask it in logs, define retention/deletion rules, obtain consent for communications, and restrict exports.
- Validate and normalize all input. Protect against injection, XSS, CSRF, SSRF, insecure file uploads, mass assignment, broken access control, and enumeration of IDs.
- Scan uploaded media, validate MIME/signature/size, strip unsafe metadata where appropriate, and provide time-limited object access.
- Maintain immutable audit events for authentication, permission, student, payment, certificate, export, and sync activity. Alert on high-risk actions.
- Add rate limits, bot protection on public inquiry endpoints, generic recovery responses, credential-stuffing controls, and anomaly monitoring.
- Use dependency/secret scanning, signed builds, code review, security tests, database least privilege, encrypted backups, tested restores, incident response, and a documented breach procedure.
- Payment data must be tokenized/hosted by a compliant gateway later; never store card data, CVV, or gateway secrets in clients.

## 6. Student Portal plan

The portal must be mobile-first, accessible, low-bandwidth tolerant, and limited to the authenticated student's records.

Phase scope should include secure activation/login/recovery, dashboard, profile, course and batch details, net-fee summary, installment schedule, posted payment ledger, outstanding dues, downloadable/verifiable receipts, notices with read state, eligible/issued certificates, and support/contact information.

Rules:

- All amounts and eligibility are calculated by backend domain services from authoritative records.
- A student can never select another student's ID to retrieve data; ownership derives from the authenticated principal.
- Sensitive imported credentials should not be displayed by default; use reveal/re-authentication and auditing if business-approved.
- Receipt/certificate links should be signed and expiring, with stable verification IDs/QR destinations where public verification is intended.
- Notifications should expose consent/preferences and delivery state. WhatsApp/SMS/email providers are asynchronous integrations, not direct browser actions.

## 7. Admin Web plan

The admin application should preserve the existing operational vocabulary while decomposing it into testable modules. The first release should target parity for the highest-value workflows, not every desktop utility at once.

Recommended order: authentication/permissions and audit; inquiry; student/admission/course/batch; fee ledger/installments/payments/receipts; reminders/notices; certificates; core reports; then expenses, salaries, ID cards, imports, printing, settings, and specialized tools.

Every list should support server-side pagination/filtering, safe export, and explicit empty/error/loading states. Destructive or financial actions need permission checks, confirmation, reason capture, and audit. Payment edits should become adjustments/reversals where possible. Reporting should use consistent definitions and reconciliation totals. Large exports and PDFs should run as background jobs.

## 8. Public Website plan

The public site is isolated from admin/student permissions and optimized for discoverability, trust, speed, and inquiry conversion. Planned content includes institute identity, courses, facilities, admission process, schedules/contact details, FAQs, policies, and an inquiry form.

Course/institute content should be published from a safe projection or CMS-like admin workflow, never by exposing operational tables. Inquiry submission needs validation, consent, rate limiting, bot protection, deduplication guidance, and an idempotent API. Public pages must not expose student, fee, staff salary, or internal operational data. Add privacy, terms, cookie/analytics choices as applicable.

## 9. Future payment/sync plan

### Online payments

Use a hosted Indian payment gateway flow after provider and compliance review. The backend creates an order; the student completes payment on the provider; a verified, signed webhook is the authoritative success signal. Store gateway order/payment IDs, amount/currency, status transitions, timestamps, reconciliation state, and raw-event reference. Enforce idempotency and verify amount/student/order before posting to the fee ledger. Generate a receipt only after verified capture. Support failure, timeout, duplicate webhook, refund, partial refund, chargeback, and manual reconciliation paths.

Keep online transactions distinct from current cash/manual payments while presenting one ledger. Run daily settlement reconciliation and restrict/refuse manual mutation of gateway-confirmed records.

### Synchronization evolution

Begin with one-way desktop → web replication and read-only portal data. Add web-owned public inquiries next. Bidirectional sync should wait for per-entity ownership, event/version semantics, conflict UI, observability, retry behavior, and reconciliation tests. Long term, migrate operations to the web system of record and retire sync deliberately; do not sustain indefinite multi-master SQLite/PostgreSQL behavior.

## 10. Step 2 development plan

Step 2 should remain a foundation/prototype milestone and must begin only after approval of this architecture.

1. Confirm product decisions: technology stack, hosting region/provider, web database, institute/tenant model, URL/domain, payment provider shortlist, messaging providers, and which system is authoritative during transition.
2. Produce a permission matrix and workflow acceptance criteria for superadmin, admin, staff, student, and anonymous users.
3. Convert the existing schema/business rules into a canonical domain model and data dictionary. Resolve money precision, date/time zones, lifecycle statuses, deletion/reversal policy, IDs, and audit requirements.
4. Define OpenAPI contracts for authentication, public inquiry, student self-service read models, and the first admin workflows. Add threat modeling and integration ADRs.
5. Scaffold the monorepo and quality gates only: formatter/linter, type checking, unit/integration test harness, environment validation, CI, dependency/secret scanning, and local container strategy. Do not import production data.
6. Implement the minimum secure vertical slice in a non-production environment: identity/session/RBAC, health endpoint, audit plumbing, one read-only student summary, and public inquiry submission, using synthetic fixtures.
7. Build contract and business-rule tests for fee totals, installments/due carry-forward, permissions, and certificate thresholds before broader UI parity.
8. Design—not execute—the initial data import/sync proof of concept with anonymized data, reconciliation reports, and rollback criteria.
9. Review the slice with operational users, record gaps, and approve the next parity milestone.

### Step 2 entry criteria

- Architecture and source-of-truth strategy approved.
- Permission matrix and student authentication approach approved.
- Hosting/data-residency/security decisions recorded.
- First-release scope and acceptance tests prioritized.
- Test/anonymized data available; no production database copy placed in the web repository.

### Step 1 conclusion

The current FMS contains mature business rules but is architected for trusted desktop/LAN execution. The new web system should reuse those rules as specifications, not reuse the Electron IPC/LAN transport as its internet boundary. The safest progression is a secure modular backend, separate public/student/admin clients, one-way audited integration first, and a controlled system-of-record transition later.

## 11. Step 2 final technology and security decisions

Decision date: 9 September 2026. Step 2 is now implemented as a dependency-light, modular JavaScript monorepo compatible with Node.js 22+ and verified on Node.js v24.16.0.

### Selected stack

- Backend runtime: Node.js ES modules using the built-in HTTP server, Web-compatible APIs, `node:crypto`, and `node:test`.
- Frontend: semantic HTML5, modern CSS, and browser ES modules. Public, student, and admin experiences are separate deployable application folders.
- API style: versioned REST/JSON under `/api/v1`, documented with OpenAPI 3.1.
- Shared code: framework-independent RBAC/domain definitions and validation contracts under `packages`.
- Step 2 persistence: in-memory repositories containing synthetic fixtures only. No SQLite, PostgreSQL, real FMS data, migration, or sync connection exists.
- Future persistence decision: PostgreSQL remains the recommended Step 3 database, subject to approval before migration creation.
- Testing: Node's built-in test runner with real ephemeral HTTP server tests.

This dependency-light selection keeps the foundation runnable without package downloads and limits the initial software supply-chain surface. A production framework may be adopted in Step 3 only if its operational value outweighs migration cost; the OpenAPI, repository, and domain boundaries are designed to survive that choice.

### Implemented runtime boundaries

`apps/public-web` owns public content and inquiry submission. `apps/student-portal` owns authenticated student self-service. `apps/admin-web` currently demonstrates privileged authentication and the server-returned permission model. `services/api` owns routing, authentication, authorization, validation, error handling, and synthetic repositories. `packages/contracts` owns validation and OpenAPI; `packages/domain` owns role/permission rules.

### Authentication and RBAC decision

The four roles remain `superadmin`, `admin`, `staff`, and `student`. Authorization is server-side and permission based. Students receive only `student:summary:read:own`; staff/admin/superadmin receive `student:summary:read:any` as appropriate. A student's record is derived from the authenticated account mapping rather than a browser-provided student ID.

Step 2 uses opaque signed session identifiers in HttpOnly, SameSite=Strict cookies. Session state and CSRF secrets are in memory, passwords are represented by per-user scrypt hashes, and comparisons use timing-safe operations. Production configuration refuses short session secrets and non-HTTPS origins. These stores and synthetic demo credentials are explicitly non-production and must be replaced in Step 3.

### Security controls delivered

- Strict CSP, frame denial, MIME sniffing prevention, same-origin resource/opener policies, no-referrer and restrictive browser permissions; HSTS in production mode.
- Same-origin checks for state-changing browser operations and per-session CSRF tokens for authenticated mutations.
- Bounded JSON request bodies, required JSON content type, normalized/allowlisted fields, consistent validation failures, and no stack traces in responses.
- Login and public inquiry rate limits, generic invalid-credential responses, cryptographically random IDs, request correlation IDs, no-store API responses, and idempotency keys for inquiry submission.
- Role and object-ownership enforcement at API handlers.
- Environment validation with local-only defaults and explicit production safeguards.

### Step 2 API decision record

The initial contract includes `GET /health`, `POST /auth/login`, `POST /auth/logout`, `GET /me`, `POST /inquiries`, `GET /students/me/summary`, and privileged `GET /students/{studentRecordId}/summary`. Public inquiry and student summary data are synthetic/in-memory. Money is represented in integer paise, dates use ISO formats, and errors use a stable envelope with a correlation ID.

### Step 2 exit decision

Step 2 is a secure development foundation, not a production release. Step 3 should add approved PostgreSQL persistence, migrations for web-native entities, persistent/revocable sessions and idempotency, student activation/recovery, privileged MFA, audit storage, expanded permission tests, and the first admin inquiry/student workflows. Real FMS data access, payments, messaging, synchronization, and production deployment remain prohibited until separately planned and approved.

## 12. Step 3 PostgreSQL persistence and identity decisions

Decision date: 9 September 2026. PostgreSQL is the approved web persistence target. The implementation uses `pg` 8.23.0 behind repository interfaces and retains synthetic mode as the safe default. Production configuration requires PostgreSQL, HTTPS, strong environment peppers/secrets, and a 32-byte base64 MFA encryption key.

Five ordered SQL migrations cover web identity, anonymized students/inquiries, persistent security state, and immutable audit storage. Migrations execute transactionally, are checksum-recorded, and cannot be edited silently after application. The development seed is refused in production. UUIDs are primary keys, money is integer paise, timestamps use `timestamptz`, and mutable workflows use optimistic versions.

Opaque session and account tokens are stored only as keyed hashes. Activation/recovery tokens are expiring and single-use; password recovery revokes active sessions. Privileged `superadmin` and `admin` logins require replay-resistant TOTP challenges. MFA secrets are encrypted with AES-256-GCM using an environment-supplied key. Audit events are append-only at both application and PostgreSQL trigger layers.

Initial admin workflows are inquiry list/filter/status change and read-only student search/summary. Status mutations enforce RBAC, CSRF, version checks, and audit insertion. Student self-service still derives ownership exclusively from the authenticated user mapping.

No local PostgreSQL runtime was available during Step 3, so SQL execution/integration verification is a required approval gate before Step 4. Synthetic HTTP and security tests passed; this milestone is not a production deployment approval.
