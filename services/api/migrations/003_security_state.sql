BEGIN;
DO $$ BEGIN CREATE TYPE account_token_kind AS ENUM ('activation','recovery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  csrf_hash char(64) NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, ip_hash char(64), user_agent_hash char(64)
);
CREATE INDEX idx_sessions_user_active ON sessions(user_id,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE account_tokens (
  token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  kind account_token_kind NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), requested_ip_hash char(64)
);
CREATE INDEX idx_account_tokens_user_kind ON account_tokens(user_id,kind,created_at DESC);
CREATE TABLE mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10), consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE idempotency_records (
  scope varchar(80) NOT NULL, idempotency_key varchar(100) NOT NULL, request_hash char(64) NOT NULL,
  response_status integer NOT NULL CHECK(response_status BETWEEN 100 AND 599), response_body jsonb NOT NULL,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(scope,idempotency_key)
);
CREATE INDEX idx_idempotency_expiry ON idempotency_records(expires_at);
COMMIT;
