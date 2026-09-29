# Step 7A — Security & Production Configuration Audit

Audit date: 2026-09-28  
Scope: FMS Web application code, production configuration boundaries, dedicated Supabase database hygiene, and production dependencies.  
Decision: **NO-GO until critical/high findings are remediated and re-tested.**

Release rule: Step 7B–7E testing may continue, but Step 7F production approval remains NO-GO until default accounts, exposed credentials, TLS verification and persistent login protection are resolved and re-tested. Migration 016 has implemented the persistent protection control; its final production configuration must still be reconfirmed at sign-off.

## Remediation status — 2026-09-28

Completed:

- Migration `016_security_hardening.sql` applied to the dedicated Supabase database.
- Persistent account-and-IP throttle buckets added; PostgreSQL account lock fields are now enforced by login.
- Trusted proxy forwarding is accepted only from explicitly configured proxy addresses.
- Production startup now requires HTTPS, PostgreSQL, verified database TLS, a CA file, and strong secrets.
- Production session cookie changed to `__Host-fms_session` with `Secure`, `HttpOnly`, `SameSite=Strict`, and `Priority=High`.
- Expired security-state cleanup runs at PostgreSQL-backed server startup. Live cleanup removed 4 expired sessions and 7 expired/consumed MFA challenges; verification now reports 0 expired non-revoked sessions.
- Secret filename patterns added to `.gitignore`.
- Full regression after code hardening: 87 passed, 0 failed.

Still blocked on owner-controlled actions:

- The database has 2 active privileged accounts and both are demo identities; there is no active non-demo privileged administrator. Disabling them automatically would lock out the institute. A real administrator identity must be created and MFA-enrolled first.
- All 3 active demo accounts still use known seed passwords. They must be reset/blocked after the real administrator is available.
- The Supabase database password must be rotated in the project dashboard, then plaintext credential files must be removed. `.gitignore` prevents new accidental inclusion but does not revoke an already exposed credential.
- Verified TLS fails with `SELF_SIGNED_CERT_IN_CHAIN`. Supabase requires downloading the project CA certificate from Database Settings and configuring it for `verify-full`; code support via `DATABASE_SSL_CA_PATH` is now present.

## Executive result

The application has a strong security baseline: server-side opaque sessions, MFA for privileged accounts, centralized RBAC, CSRF validation, same-origin checks, bounded JSON bodies, restrictive response headers, parameterized PostgreSQL access, immutable audit events, single-use recovery tokens, generic internal-error responses, and secure production cookie flags. The focused security regression suite passed 43/43 tests.

Production release is blocked by live demo accounts using known seed passwords and by plaintext database credentials stored in workspace files. TLS peer verification and distributed brute-force protection also require remediation before go-live.

## Findings

### S7A-001 — Critical — Active demo accounts retain known passwords

- Live verification found 3 demo-seed accounts, all active, and all 3 matched known passwords embedded in the repository seed/fixture code.
- Privileged MFA coverage is complete (`privilegedWithoutMfa: 0`), but MFA does not make known passwords acceptable and the staff seed account does not require privileged MFA.
- Required action: disable/remove demo accounts or force unique high-entropy passwords through the activation/recovery process; revoke every existing session; prevent production execution of the demo seed; re-run the live verifier.

### S7A-002 — High — Live database credentials are stored as plaintext workspace files

- `Supabase Password-New.txt` and `supabase URL.txt` contain PostgreSQL connection material.
- `.gitignore` excludes `.env`, but does not exclude these credential filename patterns or general local secret files.
- Required action: rotate the Supabase database password, remove plaintext credential files after transferring values to an approved secret manager, expand ignore rules, and scan any backup/history/package locations for the old credential.

### S7A-003 — High — TLS certificate verification is disabled in the current Supabase workflow

- The setup and verification workflow uses `DATABASE_SSL=true` with `DATABASE_SSL_VERIFY=false`.
- This requests encrypted transport but does not authenticate the database endpoint certificate. A pooler-backed `pg_stat_ssl` check cannot prove the client-to-pooler TLS properties; it only exposed the pooler backend connection.
- Required action: deploy a trusted CA chain and enable verification, or use a platform-supported verified connection method. Production config should fail closed if verification is disabled.

### S7A-004 — High — Login protection is process-local and IP-only

- The rate limiter uses an in-memory `Map`; counters reset on restart, are not shared across instances, and have no cleanup for dormant keys.
- `failed_login_count` and `locked_until` exist in PostgreSQL but are not used by the login flow.
- Behind a reverse proxy, `socket.remoteAddress` may identify only the proxy, weakening both throttling and audit attribution. Blindly trusting forwarded headers would create spoofing risk.
- Required action: implement persistent account-plus-IP throttling/lockout, bounded cleanup, and an explicit trusted-proxy policy.

### S7A-005 — Medium — Expired sessions are retained

- Live verification found 4 expired, non-revoked session rows and 0 active sessions.
- Authentication correctly rejects expired rows, so this is a retention/hygiene issue rather than an active bypass.
- Required action: schedule deletion or revocation of expired sessions and used/expired challenges/tokens, with an approved retention period.

### S7A-006 — Medium — Production configuration validation is incomplete

- Production startup correctly requires PostgreSQL, HTTPS origin, strong peppers/secrets, and a valid 32-byte MFA encryption key.
- It does not require `DATABASE_SSL=true`, certificate verification, an explicit production host/proxy model, or a non-demo account/seed gate.
- Required action: add fail-fast production invariants and deployment smoke tests.

### S7A-007 — Low — Cookie hardening can be improved

- Cookies use `HttpOnly`, `SameSite=Strict`, `Secure` in production, an absolute TTL, and server-side revocation.
- They do not use a `__Host-` prefix or `Priority=High`.
- Required action: adopt a `__Host-` cookie name when HTTPS-only deployment is finalized and consider `Priority=High`.

### S7A-008 — Informational — Automated advisory scan was incomplete

- The project uses npm `package-lock.json`, but the bundled environment did not provide npm CLI; pnpm correctly refused to audit without `pnpm-lock.yaml`.
- The only direct production dependency is `pg` 8.23.0. The official npm page lists 8.23.0 as current, and the located GitHub advisory for `pg` affects old versions only, not 8.23.0.
- Required action: run `npm audit --omit=dev` in the production CI environment and archive the JSON result before sign-off.

## Controls verified

- Production mode rejects synthetic datasource, non-HTTPS origin, and short secrets.
- Admin authentication requires MFA; MFA challenges are attempt-limited, expiring, and single-use.
- Sessions and CSRF values are random, stored hashed, expire server-side, and are revoked on logout or password recovery.
- RBAC distinguishes Admin, Staff, and Student access; own-student endpoints prevent cross-student reads.
- Mutations enforce CSRF and same-origin controls.
- CSP, HSTS in production, clickjacking protection, MIME sniffing protection, restrictive permissions policy, and no-referrer policy are present.
- API responses use `Cache-Control: no-store`; internal errors return generic messages with request IDs.
- PostgreSQL operations use parameterized values; audit records are append-only.
- Security regression: 43 passed, 0 failed.
- Live database: 0 active privileged accounts without MFA; 0 expired unused account tokens.

## Exit criteria for Step 7A

1. Rotate and remove exposed plaintext database credentials.
2. Disable/remove or securely reset all 3 demo accounts and revoke sessions.
3. Enable verified TLS for production database connections.
4. Implement persistent account/IP login throttling and trusted-proxy handling.
5. Add expired security-state cleanup.
6. Enforce production startup invariants and run CI `npm audit --omit=dev`.
7. Re-run focused security tests, full regression, and the live Step 7A verifier with zero critical/high findings.
