BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('superadmin','admin','staff','student'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('pending_activation','active','blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(120) NOT NULL,
  normalized_user_id varchar(120) NOT NULL UNIQUE,
  display_name varchar(120) NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'pending_activation',
  password_salt varchar(128), password_digest varchar(256),
  student_record_id uuid UNIQUE,
  mfa_secret_ciphertext text, mfa_enabled boolean NOT NULL DEFAULT false,
  failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'pending_activation') OR (password_salt IS NOT NULL AND password_digest IS NOT NULL)),
  CHECK ((role = 'student') OR student_record_id IS NULL)
);
CREATE INDEX idx_app_users_role_status ON app_users(role,status);
COMMIT;
