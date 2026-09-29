# Migration review notes

Migrations run transactionally in lexical order and are checksum-recorded. `005_synthetic_seed.sql` is refused when `NODE_ENV=production`. Application users need create/alter privileges only during migration; the runtime identity should use narrower DML privileges. No migration references any desktop/LAN FMS table or database.
