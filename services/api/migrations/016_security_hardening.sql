BEGIN;
CREATE TABLE auth_throttle_buckets(
  throttle_key char(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_throttle_cleanup_idx ON auth_throttle_buckets(updated_at);
COMMIT;
