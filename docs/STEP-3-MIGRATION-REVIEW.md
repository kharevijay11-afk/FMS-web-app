# Step 3 PostgreSQL Migration Review

Approved scope: web-native identity, synthetic students, inquiries, persistent security state, idempotency, and immutable audit events. No table or query connects to CFM/FMS LAN SQLite.

Migration order is `001` identity, `002` student/inquiry data, `003` sessions/tokens/MFA/idempotency, `004` immutable audit, and `005` optional synthetic student seed. Every file is transactional and checksum-recorded. The production runner rejects `005`.

Money uses integer paise (`bigint`); time uses `timestamptz`; human identifiers are separate from UUID primary keys; inquiry updates use optimistic versions. Tokens, session cookies, CSRF values, IP addresses, and user agents are stored only as keyed hashes. MFA secrets are AES-256-GCM encrypted by an environment key. Audit rows reject UPDATE and DELETE via a database trigger.

Review result: consistent with architecture sections 2, 3, 5, and 11. Execution against a disposable PostgreSQL instance remains pending because no PostgreSQL/Docker runtime or `DATABASE_URL` was available on this machine.
