# Step 6B PostgreSQL local setup

This setup is for a new Web-only database. Never use a FMS LAN database connection or password here.

1. Install PostgreSQL for Windows from the official PostgreSQL download page. During installation, choose and retain a password for the `postgres` administrator account. Leave the default port `5432` unless another installed service uses it.
2. In pgAdmin, connect to the local PostgreSQL server and create a new database named `fms_web_dev`. This database must be empty and dedicated to the Web project.
3. Create a restricted application login and give it access to that database. In pgAdmin Query Tool, connected to `fms_web_dev`, run the following after replacing the password locally:

```sql
CREATE USER fms_web_app WITH PASSWORD 'choose-a-long-local-password';
GRANT ALL PRIVILEGES ON DATABASE fms_web_dev TO fms_web_app;
GRANT ALL ON SCHEMA public TO fms_web_app;
```

4. In PowerShell, set the variables for the current terminal only. Do not put real passwords in source code or chat:

```powershell
$env:DATA_SOURCE = 'postgres'
$env:DATABASE_URL = 'postgresql://fms_web_app:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/fms_web_dev'
$env:MFA_ENCRYPTION_KEY = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$env:SESSION_SECRET = 'replace-with-a-long-development-secret-at-least-32-characters'
$env:TOKEN_PEPPER = 'replace-with-a-long-development-token-pepper-at-least-32-characters'
$env:AUDIT_IP_PEPPER = 'replace-with-a-long-development-audit-pepper-at-least-32-characters'
```

5. From `K:\FMS WEB System`, run:

```powershell
npm.cmd run migrate
```

6. Configure the empty admission references. Do not copy any real FMS student data:

```sql
INSERT INTO admission_courses (name, code, duration, fee_paise)
VALUES ('Example course', 'EXAMPLE-001', '3 months', 120000);

INSERT INTO admission_batches (batch_name, capacity)
VALUES ('Morning 08:00', 15);
```

7. Start the project in PostgreSQL mode and verify one test admission. Set `admission_numbering.prefix` only if the locally approved Web prefix is different from LAN's default `CC-`.

Do not run `npm.cmd run seed` for a real or production database. It exists only for synthetic development users.

## Supabase helper

From `K:\FMS WEB System`, run `.\tools\setup-supabase.ps1 -Migrate`. It securely asks for the complete Supabase **Session pooler** connection string and keeps it only in the current PowerShell process. It generates development secrets for that same process and applies migrations. It does not write the URL or password to a file.

After migration, open Supabase SQL Editor and edit/run `docs/supabase-admission-reference-template.sql` with the approved course and batch values.

## Supabase helper

From `K:\FMS WEB System`, run `.\tools\setup-supabase.ps1 -Migrate`. It securely asks for the complete Supabase **Session pooler** connection string and keeps it only in the current PowerShell process. It generates development secrets for that same process and applies migrations. It does not write the URL or password to a file.

After migration, open Supabase SQL Editor and edit/run `docs/supabase-admission-reference-template.sql` with the approved course and batch values.

## Supabase helper

From `K:\FMS WEB System`, run `.\tools\setup-supabase.ps1 -Migrate`. It securely asks for the complete Supabase **Session pooler** connection string and keeps it only in the current PowerShell process. It generates development secrets for that same process and applies migrations. It does not write the URL or password to a file.

After migration, open Supabase SQL Editor and edit/run `docs/supabase-admission-reference-template.sql` with the approved course and batch values.

## Supabase helper

From `K:\FMS WEB System`, run `.\tools\setup-supabase.ps1 -Migrate`. It securely asks for the complete Supabase **Session pooler** connection string and keeps it only in the current PowerShell process. It generates development secrets for that same process and applies migrations. It does not write the URL or password to a file.

After migration, open Supabase SQL Editor and edit/run `docs/supabase-admission-reference-template.sql` with the approved course and batch values.

## Supabase helper

From `K:\FMS WEB System`, run `.\tools\setup-supabase.ps1 -Migrate`. It securely asks for the complete Supabase **Session pooler** connection string and keeps it only in the current PowerShell process. It generates development secrets for that same process and applies migrations. It does not write the URL or password to a file.

After migration, open Supabase SQL Editor and edit/run `docs/supabase-admission-reference-template.sql` with the approved course and batch values.
