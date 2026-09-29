# FMS Web System

Step 3 secure PostgreSQL foundation. Synthetic mode is the default and no real FMS integration exists.

## Local synthetic run

```powershell
npm.cmd install
npm.cmd start
```

Open `/`, `/student`, or `/admin`. Admin demo MFA uses TOTP secret `JBSWY3DPEHPK3PXP`; it is a synthetic fixture only.

## Isolated PostgreSQL development mode

Set environment variables from `.env.example`, using fresh development-only secrets and a database created solely for this web project. Then run:

```powershell
npm.cmd run migrate
npm.cmd run seed
npm.cmd start
```

Never point `DATABASE_URL` at CFM/FMS LAN data. The application does not parse `.env` itself; inject variables through the shell or a secrets-aware process manager.

## Verification

```powershell
npm.cmd run check
npm.cmd test
```

Contracts: `packages/contracts/openapi.yaml`. Migration review: `docs/STEP-3-MIGRATION-REVIEW.md`.

## Step 6A
Active Web roles: admin, staff, student. Admin is highest privileged; former superadmin accounts retain their IDs/login names and become admin. See apps/admin-web/INTEGRATION.md. Historical architecture entries describe earlier milestones only.

## Step 6B status
Inquiry, admission and student management are implemented in synthetic mode. PostgreSQL execution needs a Web-only database plus configured admission courses/batches; see apps/admin-web/STEP-6B-STATUS.md and docs/STEP-6B-DATABASE-SETUP.md. 59 tests pass.
