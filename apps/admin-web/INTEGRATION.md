# Step 6A — Admin Dashboard + Navigation + RBAC

Completed in synthetic preview mode on 12 September 2026. Project: `K:\FMS WEB System`.

## Delivered

Responsive Admin shell with sidebar, grouped navigation, top header, breadcrumbs, role badge, account menu, logout, keyboard focus, desktop collapse and mobile off-canvas navigation. Dashboard has twelve Admin summary cards, permission-aware quick actions, recent inquiries/payments, cumulative upcoming dues, course-wise collection and batch capacity previews. Existing inquiry and student list/search APIs are reused as read-only views. Unsupported modules display “Module integration scheduled for Step 6B–6F.”

Final active Web roles: **admin, staff, student**. Admin receives former superadmin `system:admin` and `audit:read` permissions and retains mandatory MFA. The existing operational Staff matrix remains unchanged except for dashboard access. Modules without an existing operational permission use `system:admin` conservatively; future module integrations must define their permissions in the shared matrix. Students cannot open the authenticated Admin shell or Admin APIs.

Shared permissions: `packages/domain/src/rbac-step3.js`; the legacy `rbac.js` re-exports the same model. Shared navigation: `packages/domain/src/admin-navigation.js`, served to the browser at `/apps/admin-web/navigation.js`. The backend checks each module permission; hiding a menu is never authorization.

## Routes and API

Routes: `/admin`; `/admin/inquiries`; `/admin/admissions`; `/admin/students`; `/admin/left-students`; `/admin/courses`; `/admin/sessions`; `/admin/batches`; `/admin/fees`; `/admin/installments`; `/admin/payments`; `/admin/dues`; `/admin/receipts`; `/admin/notices`; `/admin/reminders`; `/admin/certificates`; `/admin/id-cards`; `/admin/expenses`; `/admin/profit-loss`; `/admin/salary`; `/admin/reports/daily`; `/admin/reports/monthly`; `/admin/reports/course-wise`; `/admin/reports/dues`; `/admin/reports/students`; `/admin/users`; `/admin/audit`; `/admin/settings`; `/admin/backup`; `/admin/account`.

Added GET APIs under `/api/v1`:

- `/admin/dashboard/summary`: authenticated, permission-filtered dashboard contract.
- `/admin/navigation`: only permitted shared menu definitions.
- `/admin/modules/{moduleId}`: permission-checked read-only pending module. Slash-containing IDs are URL encoded.

No payment, fee, certificate, account-management, backup or other business mutations were added. Existing server-side inquiry status mutation remains available with its original permission/CSRF/version checks. The Step 6A UI presents read-only lists. Direct Admin page URLs serve the login shell; private content is loaded only after authorized login.

## Synthetic data and financial boundaries

Dashboard data composes existing synthetic student summaries, inquiry repository records and server-only Step 5 fixtures. The financial snapshot remains explicitly dated **2026-09-11**. Collection cards use that snapshot date, not today's production totals. Total Due is the existing outstanding fee balance; upcoming scheduled due uses the existing cumulative snapshot, including carry-forward. An unavailable custom plan displays Pending. Fully-paid students are excluded from dues. Default synthetic batch capacity stays 15. Currency values remain integer paise until display formatting.

PostgreSQL aggregate integration remains pending. Capped repository lists are not counted as institution totals. Missing values return null; synthetic financial records are never inserted into a PostgreSQL response. Staff receives no financial dashboard sections or financial values. Inquiry previews expose only display fields, never audit or security internals.

## Superadmin compatibility and database migration

- Existing synthetic user ID `usr-super` and login `superadmin@example.test` are preserved, but their active role is Admin. The PostgreSQL seed uses Admin for that same account UUID/login.
- PostgreSQL user mapping normalizes a legacy superadmin record to Admin during transition; privileged MFA is still required.
- New `006_admin_role_migration.sql` maps stored accounts to Admin in a transaction, locks the account table during migration and adds an idempotent constraint limiting active account roles to admin/staff/student.
- Original migrations 001–005 were not changed, preserving recorded checksums.
- The old PostgreSQL enum label remains solely for immutable historical audit compatibility. No audit rows are rewritten and no trigger is disabled. The new account constraint disallows new active superadmin assignments.
- User IDs, passwords, MFA state, account tokens, session ownership and audit foreign keys are preserved. No accounts are deleted.
- Remaining source mentions of superadmin are compatibility login identifiers, the legacy mapper, negative/migration tests, or historical migration/documentation records. It is absent from active role definitions and the OpenAPI Role enum.

**Database execution: pending.** No `DATABASE_URL`, `psql` or Docker runtime is configured in this environment. Migration was source-reviewed and covered by structural tests; it has not been executed against PostgreSQL. Disposable PostgreSQL constraint/idempotency/rollback verification remains required. No production FMS data was connected.

## Security and verification

Existing cookies, CSRF, same-origin validation, rate limiting, session revocation, MFA and immutable audit remain. The browser retains CSRF in memory, escapes display strings, clears private content on logout/expiry and ignores stale responses after navigation. Reload requires sign-in again, matching the existing API's CSRF issuance flow. Account configuration/recovery for privileged users remains pending as before.

- Baseline: 29 tests passed.
- Final `npm.cmd run check`: passed.
- Final `npm.cmd test`: **37 passed, 0 failed**.
- Separate syntax checks for new Admin UI, navigation and dashboard modules: passed.
- New tests cover role migration/MFA, anonymous and Student rejection, Staff financial filtering, every shared menu/module permission, all Admin page URLs, backend fixture totals/cumulative due/capacity, logout/CSRF, read-only API methods, PostgreSQL pending behavior and migration preservation.
- Existing public, student ownership, recovery, installment carry-forward, fully-paid and certificate tests remain passing.
- Browser: Admin login and MFA; dashboard/card-to-placeholder; student search; mobile menu; Staff restricted navigation; Student Admin denial; logout clears private content. Public `/` and Student `/student` pages open successfully.
- Responsive checks at 360, 768, 1024 and 1440 pixels: no document horizontal overflow; tables scroll inside their containers. Mobile/desktop dashboard and tablet search visually inspected. Collapsed navigation retains accessible labels. Browser console inspection returned no warnings/errors.

## Files created

- `packages/domain/src/admin-navigation.js`
- `services/api/src/admin-dashboard.js`
- `services/api/migrations/006_admin_role_migration.sql`
- `packages/contracts/admin-dashboard.schema.json`
- `apps/admin-web/views.js`
- `apps/admin-web/INTEGRATION.md`
- `tests/admin-dashboard.test.js`

## Files modified

- `packages/domain/src/rbac.js`
- `packages/domain/src/rbac-step3.js`
- `services/api/src/app-step3.js`
- `services/api/src/repositories/synthetic-step3.js`
- `services/api/src/repositories/synthetic.js`
- `services/api/src/repositories/postgres.js`
- `services/api/src/db/seed.js`
- `apps/admin-web/index.html`
- `apps/admin-web/styles.css`
- `apps/admin-web/app.js`
- `packages/contracts/openapi.yaml`
- `tests/step3-security.test.js`
- `tests/openapi-contract.test.js`
- `README.md`
- `FMS-WEB-ARCHITECTURE.md`
- `FMS-WEB-DEVELOPMENT-STATUS.md`
- `PROJECT-CURRENT-STATUS.md`

Original changed files are saved under `.step6a-backup` in the project. Public Website and Student Portal source files, CFM and FMS LAN systems were not modified.

## Preview and next step

Isolated synthetic preview: `http://127.0.0.1:3002/admin`. Existing preview processes were not restarted.

Synthetic Admin login: `admin@example.test` / `ChangeMe!123`, followed by a current TOTP from the existing synthetic secret `JBSWY3DPEHPK3PXP`. Staff: `staff@example.test` / `ChangeMe!123`. These are development fixtures only.

Pending: PostgreSQL migration execution/integration verification; live aggregate repositories; Step 6B–6F business modules; privileged account configuration; existing production-readiness items. No deployment, synchronization, online payment or WhatsApp integration was performed.

Next step: **Step 6B**, only after project owner approval. Step 6B was not started.

Approved business-rule change implemented: superadmin removed and required permissions transferred to admin.

All other existing FMS business logic changed: NO
