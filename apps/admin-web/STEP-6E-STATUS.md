# Step 6E — Communications, Certificates, and ID Cards

Status: complete in code, K: workspace verification, and live PostgreSQL verification.

Implemented:

- Due reminder candidates begin seven days before the due date, use cumulative installment balances, carry shortages forward, continue while overdue, and exclude fully-paid students.
- Reminder actions save audited history independently. Admin can manually open a pre-filled `wa.me` message and must review and press Send in WhatsApp; this is not automatic delivery and does not change `not-requested` history status.
- Notices target all active students, active students in one course, active students in one session, or selected active students. Each notice stores its recipient snapshot and delivery history.
- Main certificates require completed course, full fee payment, and an issue date on or after the course-end date.
- CVRU add-on gates are Data Entry 40%, MS Office 50%, and Accounting/Tally 60%; course completion and the course-end-date restriction also apply.
- Certificate numbers are unique and certificate type is unique per student. The approved A4-landscape layout projects institute branding, student/guardian/course/training data, photo or initials placeholder, certificate number, signature line, and a Code 39 barcode.
- ID cards can be issued only to active students. The approved 85.6 × 54 mm front-card layout projects student ID, course, batch, mobile, issue date, validity, institute branding, and photo or initials placeholder on an A4 print sheet.
- All mutations are Admin-only, same-origin, CSRF-protected, transactional in PostgreSQL, and append immutable audit events.

Files added:

- `packages/domain/src/step6e.js`
- `services/api/src/step6e-routes.js`
- `services/api/src/repositories/step6e-synthetic.js`
- `services/api/src/repositories/postgres-step6e.js`
- `services/api/migrations/011_communications_certificates_id_cards.sql`
- `services/api/migrations/015_approved_print_layouts.sql`
- `services/api/src/step6e-documents.js`
- `apps/admin-web/step6e.js`
- `apps/admin-web/document-print.css`
- `apps/admin-web/document-page.css`
- `apps/admin-web/document-print.js`
- `tests/step6e.test.js`

Files changed:

- `services/api/src/app-step3.js`
- `services/api/src/repositories/synthetic-step3.js`
- `services/api/src/repositories/postgres.js`
- `apps/admin-web/app.js`
- `packages/contracts/openapi.yaml`
- `tests/openapi-contract.test.js`
- `PROJECT-CURRENT-STATUS.md`

Verification:

- Changed JavaScript syntax checks passed.
- Focused Step 6E suite: 6 passed, 0 failed.
- Full suite after manual WhatsApp-link integration: 72 passed, 0 failed.
- Migration 011 is transactional and covered by migration inventory/boundary tests.
- Migration 011 is checksum-recorded in the approved dedicated Supabase PostgreSQL database.
- Migration 015 is checksum-recorded in the approved dedicated Supabase PostgreSQL database. Live defaults are `layout-ready` and `approved-layout-ready`; no legacy pending layout rows remain.
- Live schema verification confirmed all five Step 6E tables.
- An isolated notice/recipient insert was rolled back; the persistent notice-row delta was zero.
- A zero-value reminder insert failed with the expected PostgreSQL check violation (`23514`) and was rolled back.
- Reusable verification command: `node tools/verify-step6e-live.js` with the approved PostgreSQL environment variables injected.

Pending controlled integrations:

- Connect portal notice projection for PostgreSQL students where the Student Portal repository is implemented.
- Automatic/background WhatsApp delivery still requires provider, consent, retry, template, credential, and audit policy approval. Manual `Open in WhatsApp` needs no API credentials.
- Automatic/background WhatsApp and PostgreSQL Student Portal notice projection remain separate controlled integrations; printable certificate and ID-card output is now implemented from the supplied approved samples.

Existing FMS LAN System modified: NO. Existing fee, admission, receipt, role, or backup rules changed: NO.
