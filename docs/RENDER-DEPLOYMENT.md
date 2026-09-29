# Render deployment

The repository includes `render.yaml` for a Node web service. Render supplies
`PORT`; the service binds to `0.0.0.0` and derives its HTTPS origin from
`RENDER_EXTERNAL_HOSTNAME`.

Required secrets during Blueprint creation:

- `DATABASE_URL`: Supabase transaction-pooler URI (port 6543).
- `MFA_ENCRYPTION_KEY`: the existing 32-byte base64 key. Changing it makes
  already-encrypted MFA secrets unreadable.

Before the first deploy, add a Render secret file named
`supabase-ca.crt`. It is mounted at `/etc/secrets/supabase-ca.crt`; paste the
trusted Supabase database CA chain downloaded from the Supabase connection or
database settings panel. Do not disable certificate verification.

The health check is `/api/v1/health`. Schema migrations are intentionally not
run in the web-service start command; apply reviewed migrations as a controlled
release step.
