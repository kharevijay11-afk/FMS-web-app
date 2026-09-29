# Step 7D — Real-data UAT

Date: 2026-09-28  
Environment: dedicated FMS Web App Supabase  
Current result: **PARTIAL PASS — ROLE-WISE SIGN-OFF BLOCKED**

## Completed live checks

All checks were read-only and emitted aggregate, no-PII evidence.

- Live schema and repository queries connected successfully.
- 1 active student record, 3 inquiry records and 12 installments were available.
- Daily, monthly and course-wise collection reports reconciled to 100 paise.
- Fee engine calculated total fee 1,700,000 paise, paid 100 paise and outstanding 1,699,900 paise.
- Due report and finance engine outstanding totals matched.
- Student report and course-wise student counts matched.
- Full automated regression after the live fix: **92 passed, 0 failed, 0 skipped**.

## Live defect found and fixed

The PostgreSQL monthly report used an implicit `month` alias that failed on the live Supabase database with SQL error `42601`. It now uses the explicit portable form `AS month`.

A regression assertion was added to prevent this query from reverting.

## Role readiness

| Role | Active live accounts | Real-data UAT status |
|---|---:|---|
| Admin | 2 | Technically present, but Step 7A identifies them as demo identities |
| Staff | 1 | Technically present, but Step 7A identifies it as a demo identity |
| Student | 0 | Blocked: no student-role account linked to the active student |

Role-wise UAT cannot be signed off using real identities until approved non-demo accounts exist. Synthetic RBAC remains fully covered by the automated regression suite.

## Data readiness observations

- Student `paid_paise` snapshot: 0
- Posted payment ledger: 100 paise
- Application finance/report calculations consistently use the posted ledger and reconcile at 100 paise.
- The denormalized student snapshot does not match the ledger and must not be manually changed until the business owner confirms whether the ₹1 posted payment is valid UAT data or a test artifact.
- Live notices: 0
- Live certificates: 0
- Live ID-card issues: 0
- Live expenses: 0
- Live salary rows: 0

These empty areas cannot receive real-record UAT sign-off from read-only testing.

## Required actions for final 7D sign-off

1. Create/activate approved non-demo Admin and Staff accounts and retire the demo identities according to Step 7A.
2. Create a Student account linked to the approved active student record, using the normal activation flow.
3. Business owner must classify the ₹1 posted payment as valid or test data; correct it only through the audited payment/reversal workflow.
4. Approve representative notice, certificate and ID-card scenarios. Certificate issuance must satisfy its payment/course-end eligibility rules.
5. Have each role execute the UAT checklist and record name/date/result:
   - Admin: admission, payment, reports, notice, certificate/ID card and administration access.
   - Staff: inquiry/student workflows and Student Reports; confirm restricted modules are unavailable.
   - Student: own profile, course, fees, installments, payments, receipts, dues, notices and certificate status.
6. Obtain business-owner sign-off on displayed student, fee, due and document values.

## Files

- `tools/verify-step7d-readiness-live.js`
- `tools/verify-step7d-business-live.js`
- `services/api/src/repositories/postgres-reports.js`
- `tests/step6f-reports.test.js`

Step 7D remains open until the role-account and representative-record conditions above are completed. Step 7E performance testing may be prepared in parallel, but production go-live sign-off cannot rely on this partial UAT.

