# Step 4 public website integration boundaries

The existing Node server, / route, /student, /admin and POST /api/v1/inquiries are reused. Public pages use #/ paths so no API/static-routing change is required. No backend, contract, database, security middleware or FMS domain files changed.

## Presentation modules
- content.js: explicitly synthetic public content, hero image/heading/description/button/link, notice flags/date/link, course display metadata, categorized gallery, testimonial active/rating/photo, resource metadata, contact/about and student links. Popup is disabled (null), social links empty until approved.
- pages.js: escaped page templates and safe public-link handling, course detail views and reusable cards.
- inquiry.js: frontend mapping and in-memory request retry state.
- app.js: routing, navigation, manual slider, gallery filter/lightbox and form binding.
- styles.css: mobile-first blue/white design. index.html: page shell, CSS monogram (not an official logo), navigation and footer.

## Inquiry compatibility
Email (optional), preferred session and address are prefixed into the existing message field. Combined message limit remains 500 characters and is enforced before submission; server validation remains authoritative. These are inquiry preferences, not operational course/session identifiers. No automatic admission is performed. No new API fields are silently discarded.

One in-memory key is retained for uncertain retries; repeated clicks are blocked, changed uncertain payloads rejected, and a confirmed request cannot submit again until explicitly reset. No inquiry personal information is placed in localStorage/sessionStorage. Reloading the document discards this retry state: do not reload after an uncertain response. Cross-tab/concurrent server-side exactly-once guarantees are outside this frontend change; the existing repository behavior is preserved.

## TODO / pending approved integrations
- Public content CMS/read projection for hero, announcements, popup, notices, courses, gallery, testimonials, contact/about, social/student links and footer. Replace fixture module through this boundary; never import private operational records into frontend bundles.
- Secure certificate-number verification endpoint: current shell sends nothing and displays no certificate/student data.
- Approved storage/download URLs for assignment/project/practical materials. No file-serving endpoint added.
- Verified live course catalogue, durations, eligibility, admission status, official logo, actual photographs, testimonials, office hours, institute history/mission/vision, final privacy/terms text and CVRU result link.
- The reference https://createcomputer.in/ could not be retrieved in this session. User-supplied section requirements were used; no unverified live-site content was copied.
- Google Maps uses an outbound address-search link; an embedded frame would require a reviewed CSP change, so the existing CSP is retained.
- PostgreSQL integration verification remains the separate pre-existing pending work. No production data, deployment or Step 5 work.

## Validation
Run npm.cmd run check and npm.cmd test. The package check script covers existing backend files; additionally run node --check on all four public JavaScript modules.
