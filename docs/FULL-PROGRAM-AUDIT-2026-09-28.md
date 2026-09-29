# FMS Web System — Full Programme Audit

Audit date: 2026-09-28  
Overall result: **Core FMS workflows are stable; production programme is incomplete and remains NO-GO.**

## What was verified

- 309 project files inspected, including 16 test files and 16 numbered SQL migrations plus the development-only synthetic seed.
- Full automated suite: **92 passed, 0 failed, 0 skipped**.
- Server syntax check passed.
- Admin login and MFA loaded in the browser; dashboard, Users and Backup/Restore navigation were visible.
- Public website loaded, but visibly identifies itself as a development preview with synthetic content.
- Live Supabase: all 15 production migrations recorded; 0 checked orphan/duplicate integrity violations.
- Live finance/report reconciliation passed: daily, monthly, course-wise and due totals agree.
- Live performance baseline, backup validation and transactional rollback evidence from Steps 7C–7E remain green.

The fresh detached local preview process did not remain available long enough to repeat the complete Staff/Student browser traversal in this audit. Those roles remain covered by the 92-test suite and the completed Step 7B browser evidence; this interruption is a local test-host limitation, not a newly proven application defect.

## Critical — must close before production

### 1. Production identities and default credentials

- 3 demo accounts are active and all still match known seed passwords.
- Both privileged accounts are demo identities.
- Active non-demo privileged Admin accounts: 0.
- Live Student-role accounts linked to the active student: 0.

Required: create approved Admin/Staff/Student identities through activation, enroll Admin MFA, verify recovery, block demo accounts and revoke all demo sessions.

### 2. Exposed database credentials

Plaintext credential material remains in workspace files including `Supabase Password-New.txt`, `Supabase Password.txt`, `supabase URL.txt` and `.env.txt`.

Required: rotate the Supabase password, move secrets to an approved server secret manager, securely remove plaintext copies and scan all backup/export locations.

### 3. Verified database TLS

Current live verification still uses `DATABASE_SSL_VERIFY=false`; verified peer TLS/CA is not proven. Production code correctly refuses this configuration, so production startup cannot be signed off yet.

Required: install the Supabase CA chain, set `DATABASE_SSL_VERIFY=true`, configure `DATABASE_SSL_CA_PATH` and rerun all live checks.

## High — material functional/operational work still missing

### 4. PostgreSQL Student Portal projection is not implemented

`createPostgresRepository` has no `getStudentPortal` or `markStudentNoticeRead` implementation. In live PostgreSQL mode the extended portal returns a pending state rather than real profile/course/installment/payment/notice/certificate projections.

Missing live Student features:

- own extended profile/course/batch projection;
- notice audience projection and read acknowledgement;
- receipt document access;
- certificate secure view;
- learning-resource projection/download;
- linked Student account activation and role UAT.

### 5. Account activation/recovery delivery

Activation and recovery token security exists, but there is no approved email/SMS/WhatsApp delivery provider. Pending users cannot complete a normal real-world activation workflow without an operator-controlled delivery process.

### 6. Application “Backup” is not a complete disaster-recovery backup

The logical export currently contains settings, users, courses, batches, payments, expenses and salaries. It omits major datasets such as students, inquiries, installments, notices/recipients, certificates, ID cards, revisions and audit history. Restore apply is validate-only.

Required: continue treating provider snapshot/encrypted `pg_dump` as authoritative, test restore on a disposable target, and rename/clarify the UI export so it cannot be mistaken for complete DR protection.

### 7. Real-data UAT is incomplete

- ₹1 posted ledger entry is not classified as valid business data or a test artifact.
- `students.paid_paise` snapshot is 0 while the posted ledger is 100 paise; operational reports correctly use the ledger, but the stale snapshot needs an explicit ownership/deprecation decision.
- Live notices, certificates and ID-card issues are all 0, so representative-record UAT is absent.
- No approved role-wise business-owner signatures exist.

### 8. Public website is still a development preview

The public site contains synthetic/demo courses, illustrations and preview labels. Still missing approved official logo, institute content, actual course catalogue/durations/eligibility, admission status, photographs, testimonials, hours, privacy policy, terms and verified external links.

### 9. Public certificate verification is only a shell

The certificate form intentionally submits nothing and performs no lookup. A privacy-safe verification API and response design are still required.

### 10. Receipt/document generation is incomplete

Admin payment records exist, but Student Portal receipt downloads return `501 DOCUMENT_PENDING`. Printable receipt layout and authorized document generation/download are not implemented.

### 11. Production deployment has not been executed

There is a deployment/rollback runbook, but no approved HTTPS server deployment, reverse-proxy validation, secret-manager integration, monitoring/alerting evidence, log-retention setup or post-deployment smoke result.

### 12. No provider-level restore evidence

Transactional rollback passed, but a real snapshot/`pg_dump` restore to a disposable PostgreSQL target has not been completed and reconciled.

## Medium — should close before or shortly after staging

### 13. Learning resources and credential features are placeholders

Assignments/projects/practical items have no approved secure files. Student credential reveal remains intentionally unavailable and would require re-authentication plus an audited policy.

### 14. WhatsApp is manual only

“Open in WhatsApp” works as designed. Automatic/background delivery still needs provider credentials, consent records, approved templates, retry/deduplication policy and delivery audit. This is optional unless automatic sending is a launch requirement.

### 15. Dependency/security audit evidence is absent

The project has a lockfile and only `pg` as a direct dependency, but npm CLI is unavailable here, so `npm audit --omit=dev` has not been archived from CI/production tooling.

### 16. UI encoding artifacts

Admin browser output still contains mojibake such as `Â·` and `â–¦`. Functionality works, but UTF-8 source/response encoding should be normalized before visual sign-off.

### 17. Reload/session usability

Admin hard reload requires sign-in again because CSRF state is memory-only. This is secure but inconvenient; the business owner should explicitly accept it or approve a secure session-bootstrap design.

### 18. Public/legal data governance

Final inquiry retention, deletion procedure, privacy/terms approval and public content ownership are not documented as operational policies.

### 19. Release traceability is weak

This workspace is not a Git repository, and package metadata still says version `0.3.0` / “Step 2 foundation.” There is no immutable release tag/commit or reproducible artifact checksum tied to sign-off.

### 20. Documentation contains stale historical statements

Some integration/status documents still say migrations or PostgreSQL execution are pending even though migrations 001–016 (excluding development seed 005) have been applied. The authoritative Step 7 documents are newer, but stale notes can mislead operators.

## Complete/stable areas

- Inquiry, admission conversion and student/left-student management.
- Course, session and batch management.
- Fee ledger, installments, payments, reversal, dues and receipts as records.
- Daily/monthly/course/due/student reporting.
- Notices/reminder history and manual WhatsApp opening.
- Certificate eligibility/issuance and approved certificate/ID-card print layouts.
- Expenses, profit/loss and Staff salary.
- Users, audit, institute settings and credential-free logical export validation.
- Admin/Staff/Student RBAC, MFA, CSRF, same-origin controls, session security and persistent account/IP throttling.
- Migration integrity, concurrency correctness and read-only live pool performance baseline.

## Recommended completion order

1. Close Step 7A: real Admin, MFA/recovery, demo-account removal, credential rotation and verified TLS.
2. Implement PostgreSQL Student Portal projection and activate a linked real Student account.
3. Classify the ₹1 payment and complete role-wise real-data UAT with representative notice/ID-card/eligible certificate records.
4. Replace public synthetic content and approve privacy/terms; add certificate verification and receipt documents if required for launch.
5. Complete provider-level restore drill and production monitoring/backup operations.
6. Deploy to HTTPS staging, rerun security/workflow/performance tests, fix UTF-8 artifacts and obtain named sign-offs.

Until items 1–3 and the mandatory deployment/restore gates are complete, public production remains **NO-GO**.

