BEGIN;
-- Preserve the original enum because immutable historical audit rows use it.
-- The active-account constraint disallows the retired role without rewriting audit history.
LOCK TABLE app_users IN SHARE ROW EXCLUSIVE MODE;
UPDATE app_users SET role='admin', updated_at=now() WHERE role='superadmin';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='app_users_active_web_role' AND conrelid='app_users'::regclass) THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_active_web_role CHECK (role::text IN ('admin','staff','student'));
  END IF;
END $$;
-- User IDs, password/MFA state, session ownership, account tokens and audit links stay intact.
COMMIT;
