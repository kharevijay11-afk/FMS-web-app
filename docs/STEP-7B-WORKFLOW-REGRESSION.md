# Step 7B — Complete Workflow Regression

Date: 2026-09-28  
Environment: local synthetic application plus read-only live Supabase verification  
Result: **PASS WITH PRE-PRODUCTION CONDITIONS**

## Executive result

- Automated regression: **87 passed, 0 failed, 0 skipped**.
- Browser smoke: Admin, Staff and Student authentication and authorized navigation passed.
- Live Supabase: all 15 production migrations are recorded. Migration `005_synthetic_seed.sql` is correctly excluded from production.
- Live integrity: **0 orphan or duplicate-key violations** across the checked workflow tables.
- No live student, payment, certificate, ID-card or notice data was changed during this regression.

This result confirms Step 7B functional regression. It does not override the open production-owner security actions recorded in `STEP-7A-SECURITY-AUDIT.md`.

## Workflow matrix

| Area | Automated evidence | Browser evidence | Live database evidence | Result |
|---|---|---|---|---|
| Admin | MFA, RBAC, CSRF, navigation, dashboard and account tests | Admin MFA login and complete authorized menu loaded | Production migrations present | Pass |
| Staff | Restricted role, read-only student access and report permissions | Staff login; Students and Student Reports opened; Users and Backup absent; unauthorized ID-card route denied | No mutation performed | Pass |
| Student | Own-data isolation, fees, payments, notices, certificates and security | Profile, course, fees, installments, payments, receipts, dues, notices and certificates opened | Student relations valid | Pass |
| Admission | Validation, numbering, conversion, replay safety, capacity, rollback and audit | Admissions and Students pages opened | 1 student and 3 inquiries; no duplicate student ID | Pass |
| Fees | Fee formula, installments, posted/reversed payment ledger, receipts and due calculation | Fee Collection page opened | 1 payment and 12 installments; no orphan payment/installment or duplicate receipt | Pass |
| Reports | Daily, monthly, course-wise, due and student read models; RBAC and read-only methods | All five report pages opened successfully | Source relations valid | Pass |
| Certificates | Eligibility gates, uniqueness, audit, API protection and approved print HTML | Certificate issue page opened | 0 live certificates; no orphan/duplicate certificate | Pass (synthetic issue/render coverage) |
| ID cards | Active-student gate, issue/print tracking, API protection and approved print HTML | ID-card issue page opened | 0 live ID cards; no orphan issue | Pass (synthetic issue/render coverage) |

## Browser observations

Admin direct hard reload intentionally returns to sign-in because the current frontend does not restore a CSRF-bearing session after reload. In-app navigation works after authentication. This is a known usability limitation, not an authorization bypass.

During the first navigation pass the detached local server stopped, producing temporary `Failed to fetch` pages. After restarting the server and re-authenticating, every target page loaded. This was a test-harness interruption, not an application regression.

### Low-severity defect

Some browser text contains encoding artifacts such as `Â·` and `â–¦`. Functional behavior is unaffected, but UTF-8 response/static-file handling should be normalized before visual UAT.

## Live Supabase verification

Read-only verifier: `tools/verify-step7b-live.js`

- Recorded production migrations: 15
- Missing production migrations: 0
- Orphan payments: 0
- Orphan installments: 0
- Orphan certificates: 0
- Orphan ID cards: 0
- Orphan notice recipients: 0
- Duplicate student IDs: 0
- Duplicate receipt numbers: 0
- Duplicate certificate numbers: 0

Live row snapshot at verification time: 1 student, 3 inquiries, 1 payment, 12 installments, 0 notices, 0 certificates and 0 ID cards.

## Conditions and next action

Step 7B is complete for synthetic end-to-end regression and read-only production consistency. Real-data issuance/printing was not performed because the live database currently has no certificate or ID-card issue records and this test was intentionally non-mutating.

Before go-live:

1. Complete the open Step 7A production-owner security actions.
2. Fix the low-severity UTF-8 rendering artifacts.
3. Continue with **Step 7C — Backup/Restore and Rollback Drill**.

