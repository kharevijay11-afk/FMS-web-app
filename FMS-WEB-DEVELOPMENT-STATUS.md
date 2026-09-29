> Latest — 12 September 2026: Step 6B partially implemented. Inquiry/Student/Left Student management verified, 49 tests passed. Admission creation/conversion await existing FMS numbering/admission rules. PostgreSQL execution remains pending. See apps/admin-web/STEP-6B-STATUS.md. Do not start Step 6C yet.

> Current Web role model — 12 September 2026, Step 6A: admin, staff, student. Admin is the highest privileged role and receives required former superadmin permissions with MFA. Earlier role descriptions below are historical; do not reintroduce superadmin. Step 6A is verified in synthetic mode (37 tests pass); PostgreSQL migration execution remains pending. See apps/admin-web/INTEGRATION.md and PROJECT-CURRENT-STATUS.md for the latest status.

# FMS Web System Development Status

Updated: 9 September 2026  
Current milestone: Step 3 complete in synthetic verification mode  
Production readiness: not approved

## Delivered

- PostgreSQL repository and versioned transactional migrations for identity, anonymized students, inquiries, sessions, activation/recovery tokens, MFA challenges, idempotency records, and immutable audit events.
- Checksum-aware migration runner and production-blocked synthetic seed runner.
- Persistent opaque sessions, revocation, hashed CSRF tokens, persistent idempotency, and password-reset session revocation.
- Student activation and account recovery using expiring, single-use, hashed tokens and strong-password policy.
- Mandatory TOTP challenge for superadmin/admin, replay-resistant challenges, attempt/expiry limits, and AES-256-GCM encrypted MFA secrets.
- Database-trigger-enforced append-only audit log and synthetic immutable audit behavior.
- Admin inquiry listing/filtering/status workflow with optimistic concurrency, CSRF, RBAC, and audit.
- Read-only admin student search plus existing student-owned summary workflow.
- OpenAPI 3.1 contract updated to version 0.3.0 and UIs updated for MFA, inquiry queue, student lookup, activation, and recovery.

## Verification

- Node.js v24.16.0 syntax checks passed.
- 10 automated tests passed, 0 failed.
- npm audit reported 0 known vulnerabilities for 15 installed packages.
- SQL review completed against the approved architecture.
- PostgreSQL execution test pending: this workstation had no `psql`, Docker, or configured `DATABASE_URL`.

## Guardrails retained

- Default local data source is synthetic.
- Production refuses synthetic mode, non-HTTPS origin, weak peppers/secrets, missing PostgreSQL URL, or invalid MFA encryption key.
- No real FMS database access, sync, payment, WhatsApp, production deployment, or real data.

## Before Step 4

Approval is required for a disposable PostgreSQL test instance and credentials so migrations, constraints, rollback/failure behavior, and repository integration can be exercised end-to-end. Also approve the delivery provider and channel for activation/recovery, MFA enrollment/recovery policy, audit retention/DBA exception process, production PostgreSQL hosting/data residency, and whether staff must also use MFA.
