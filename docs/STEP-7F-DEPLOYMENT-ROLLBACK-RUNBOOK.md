# Step 7F — Deployment and Rollback Runbook

This runbook is for the dedicated FMS Web App environment. It must be executed by the authorized server/database operator during an approved change window.

## 1. Preconditions

Do not deploy publicly until every mandatory gate in `STEP-7F-GO-LIVE-SIGN-OFF.md` is green.

- Approved release identifier and immutable artifact/checksum recorded.
- Non-demo Admin exists, MFA is enrolled and recovery has been tested.
- Demo accounts are blocked and their sessions revoked.
- Database password is rotated and stored only in an approved secret manager.
- Verified Supabase TLS works with `DATABASE_SSL_VERIFY=true` and `DATABASE_SSL_CA_PATH`.
- HTTPS domain, certificate, reverse proxy and trusted proxy addresses are ready.
- Provider snapshot/backup exists and its restore has been tested on a disposable target.
- Step 7D role-wise UAT is signed by the business owner.

## 2. Required production configuration

Set secrets through the server secret manager, not files in the release directory:

- `NODE_ENV=production`
- `DATA_SOURCE=postgres`
- `APP_ORIGIN=https://<approved-domain>`
- `DATABASE_URL=<secret-manager-reference>`
- `DATABASE_SSL=true`
- `DATABASE_SSL_VERIFY=true`
- `DATABASE_SSL_CA_PATH=<absolute-ca-path>`
- Strong `SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `TOKEN_PEPPER` and `AUDIT_IP_PEPPER`
- `TRUST_PROXY=true` only with explicit `TRUSTED_PROXY_ADDRESSES`
- Approved `HOST`, `PORT` and session/security TTL values

The application must fail closed if these production invariants are absent.

## 3. Pre-deployment backup and baseline

1. Enable the maintenance window and stop business writes.
2. Record current application release and environment owner.
3. Take a provider snapshot or encrypted `pg_dump`; record timestamp and checksum.
4. Record migration versions, critical table counts and financial totals.
5. Run the read-only Step 7B, 7A and 7D verifiers.
6. Confirm the rollback release artifact and prior environment configuration remain available.

Never treat the credential-free application logical export as a complete disaster-recovery backup.

## 4. Deployment sequence

1. Copy/extract the immutable release into a new versioned directory.
2. Install locked production dependencies with the available Node package manager using the lockfile.
3. Run syntax checks and the full automated suite.
4. Load production secrets without printing them.
5. Run `node services/api/src/db/migrate.js` once. Migrations are forward-only and checksum recorded.
6. Start the new application process behind the private upstream port.
7. Verify `/api/v1/health` reports PostgreSQL mode and the expected version.
8. Run anonymous, Admin MFA, Staff restriction and Student-own-data smoke tests.
9. Verify admissions, payments and reports using approved UAT records.
10. Switch the reverse proxy/upstream to the new release.
11. Monitor errors, latency, CPU/RAM, event-loop delay and database pool usage for at least 30 minutes.
12. End maintenance only after the deployment owner and business owner accept the smoke results.

## 5. Immediate rollback triggers

- Health check fails or reports the wrong datasource/version.
- Authentication, MFA, RBAC, CSRF or session behavior differs from the approved baseline.
- Any duplicate admission/receipt, lost update or financial mismatch appears.
- Error rate is non-zero for normal smoke traffic or p95 exceeds the approved production target.
- Database connections exhaust, migrations fail, or reconciliation differs from the pre-deploy baseline.
- Secrets appear in logs or responses.

## 6. Application rollback

1. Re-enable maintenance and stop writes.
2. Preserve logs, request IDs and the failed release artifact for investigation.
3. Point the reverse proxy back to the last known-good application release.
4. Restore the previous environment configuration from the secret manager.
5. Restart and run health, authentication, role and financial read-only smoke tests.
6. Compare table counts and financial totals to the recorded baseline.
7. Record the incident, rollback time, operator and reconciliation result.

Do not delete the failed release or logs during the incident.

## 7. Database rollback

The SQL migrations do not include automatic down migrations. Do not manually drop columns/tables or edit `schema_migrations`.

If an application rollback remains compatible with the migrated schema, leave the schema forward and roll back only the application. If data/schema restoration is unavoidable:

1. Keep maintenance enabled and stop every application instance.
2. Create an additional incident snapshot of the failed state.
3. Restore the pre-deployment snapshot into a separate database first.
4. Run migrations/checksums, table-count, financial-total and sample-record reconciliation.
5. Point a staging application at the restored target and complete role smoke tests.
6. Cut over only after database owner, security owner and business owner approve.

## 8. Post-deployment evidence

Archive the release checksum, migration output, dependency audit, health response, smoke results, performance metrics, backup/snapshot reference, monitoring screenshots, rollback readiness confirmation and completed sign-off sheet. Do not archive plaintext secrets.

