# Step 7F — Go-live Checklist and Sign-off

Assessment date: 2026-09-28  
Current decision: **NO-GO**

The application code is functionally stable, but mandatory security and real-role UAT gates are not closed. No authorized production sign-off has been provided.

## Governing release rule

Step 7B through Step 7E verification may proceed, but Step 7F production approval remains **NO-GO** until the Step 7A default accounts, exposed credentials, verified database TLS and persistent login-protection requirements are resolved and re-tested.

Persistent account-plus-IP throttling was implemented and applied through migration `016_security_hardening.sql`; its technical regression is green. It remains a release gate only in the sense that the deployed production configuration and trusted-proxy behavior must be re-confirmed alongside the other Step 7A controls. Default accounts, exposed credentials and verified TLS remain actively unresolved.

## Verified green gates

- Full automated regression: **92 passed, 0 failed, 0 skipped**.
- Focused authentication/RBAC/student isolation regression: **29 passed**.
- Production migrations recorded: 15; missing: 0.
- Live referential/duplicate integrity violations: 0.
- Backup/rollback drill passed after correcting the production backup schema queries.
- Performance/concurrency baseline passed; live pool handled 100/100 read-only queries.
- Production monthly report SQL defect fixed and verified live.
- Privileged accounts without MFA: 0.
- Expired non-revoked sessions: 0; expired unused account tokens: 0.

## Defect closure matrix

| ID | Finding | Severity | Status |
|---|---|---:|---|
| 7C-DB-001 | Backup queried non-existent academic tables | High | Closed and verified live |
| 7D-DB-001 | Monthly report SQL failed on live Supabase | High | Closed and verified live |
| 7B-UI-001 | UTF-8 artifacts such as `Â·`/`â–¦` | Low | Open |
| 7B-UX-002 | Admin hard reload requires sign-in again | Low | Accepted only if business owner approves |
| S7A-001 | Three active demo accounts use known passwords; no non-demo Admin | Critical | Open |
| S7A-002 | Plaintext Supabase credential files remain in workspace | High | Open |
| S7A-003 | Database TLS peer verification is disabled/unproven | High | Open |
| 7D-UAT-001 | No Student role account; Admin/Staff are demo identities | High | Open |
| 7D-UAT-002 | ₹1 posted payment classification not approved | High | Open |
| 7D-UAT-003 | Notice/certificate/ID-card real-record sign-off absent | High | Open |
| 7C-DR-001 | Provider snapshot restore not proven on disposable PostgreSQL | High | Open |
| 7F-DEP-001 | Production dependency audit unavailable because npm CLI is absent | Medium | Open |

## Fresh live security recheck

- Active privileged accounts: 2
- Active non-demo privileged accounts: 0
- Active demo accounts: 3
- Demo accounts matching known default passwords: 3
- Privileged accounts without MFA: 0
- TLS verification used by current verifier: disabled
- Workspace plaintext credential files still present: `Supabase Password-New.txt`, `Supabase Password.txt`, `supabase URL.txt`, and `.env.txt`

These results retain the Step 7A critical/high NO-GO decision.

## Mandatory release checklist

- [ ] Create and activate named non-demo Admin; enroll/test MFA and recovery.
- [ ] Create approved Staff and linked Student accounts; complete role-wise UAT.
- [ ] Block/reset all demo accounts and revoke their sessions.
- [ ] Rotate Supabase password, move secrets to an approved secret manager, and securely remove plaintext files.
- [ ] Install the Supabase CA chain and prove `DATABASE_SSL_VERIFY=true` in staging/production.
- [ ] Classify the ₹1 ledger entry and correct it only through the audited payment/reversal workflow.
- [ ] Approve and verify representative notice, eligible certificate and ID-card records.
- [ ] Run `npm audit --omit=dev` in CI/production tooling and archive the result.
- [ ] Restore a provider snapshot/`pg_dump` into a disposable target and reconcile it.
- [ ] Deploy to staging HTTPS and rerun workflow, security and performance smoke tests.
- [ ] Record monitoring, alerting, backup schedule, retention, support owner and incident contacts.

## Authorized sign-off

Every mandatory checklist item must be complete before signatures are valid.

| Authority | Name | Decision | Date/time | Signature/reference |
|---|---|---|---|---|
| Business owner |  | GO / NO-GO |  |  |
| Security owner |  | GO / NO-GO |  |  |
| Database/backup owner |  | GO / NO-GO |  |  |
| Deployment owner |  | GO / NO-GO |  |  |

Codex recommendation: **NO-GO for public production.** Staging deployment may proceed if isolated from real users and secrets are handled securely. Re-run the live security verifier and Step 7D UAT after the owner-controlled actions; change this decision to GO only when every mandatory gate and authorized signature is complete.
