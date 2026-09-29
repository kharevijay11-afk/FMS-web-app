# Step 7C — Backup/Restore and Rollback Drill

Date: 2026-09-28  
Result: **PASS WITH CONTROLLED-RESTORE CONDITION**

## Outcome

- Full automated suite: **91 passed, 0 failed, 0 skipped**.
- Step 7C targeted suite: **4 passed**.
- Live Supabase logical backup generated successfully in memory.
- Backup restore-format validation passed; restore apply remains intentionally disabled.
- Live transaction rollback restored settings and all checked row counts exactly.
- No live business data was permanently changed.

## Defect found and fixed

The PostgreSQL backup repository queried non-existent `courses` and `academic_batches` relations, causing production backups to fail with PostgreSQL error `42P01`.

The queries now use the deployed schema:

- `admission_courses` with the `duration` column
- `admission_batches` without a non-existent status column

A regression test now prevents these invalid table names from returning.

## Live logical-backup evidence

- Format: `fms-web-logical-backup-v1`
- Source: PostgreSQL
- Payload size: 1,975 bytes
- SHA-256: `affa72fcfcf276b070993eceddc0a0e72b5dbb76c5f18bcb77ad32c42960f9c1`
- Sections: settings 1, users 3, courses 4, batches 4, payments 1, expenses 0, salaries 0
- Exposed credential fields: 0
- Restore package validation: passed
- Restore apply available: no

The checksum proves the exact in-memory package tested in this drill. The backup payload itself was not written to disk or included in logs.

## Live rollback evidence

The drill opened a database transaction, changed institute settings inside it, exercised an invalid-version constraint through a savepoint, and rolled back the outer transaction.

- PostgreSQL constraint response: `23514`
- Settings restored: true
- Checked row counts restored: true
- Recorded production migrations: 15
- Persistent writes from drill: 0

Reconciled tables: students, inquiries, payments, admission installments, notices, notice recipients, certificates, ID-card issues, expenses, staff salaries, users and audit events.

## Restore boundary

The application currently supports logical-backup export and restore validation only. It does not apply a restore through the web interface. This is a deliberate safety boundary.

A genuine disaster-recovery restore must use an approved maintenance window with:

1. Supabase/provider snapshot or `pg_dump` backup.
2. A separate disposable PostgreSQL target.
3. Restore into that target, never directly over production.
4. Schema, row-count, financial-total and sample-record reconciliation.
5. Application smoke testing against the restored target.
6. Explicit owner approval before any production cutover.

Because no disposable PostgreSQL target and maintenance window were provided, destructive restore/cutover was not attempted. This does not block the validated application-level drill, but remains required evidence for final disaster-recovery sign-off.

## Files

- `tests/step7c-backup-rollback.test.js`
- `tools/verify-step7c-live.js`
- `tools/verify-step7c-backup-live.js`
- `services/api/src/repositories/postgres-administration.js`

## Next milestone

Proceed to **Step 7D — Real-data UAT**. Production go-live remains subject to Step 7A owner actions and final provider-level restore evidence.

