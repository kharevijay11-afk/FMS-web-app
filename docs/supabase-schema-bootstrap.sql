-- Generated from FMS Web migrations. Synthetic seed data is intentionally excluded.
CREATE TABLE IF NOT EXISTS schema_migrations(version varchar(120) PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());

-- 001_extensions_and_identity.sql
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

INSERT INTO schema_migrations(version,checksum) VALUES('001_extensions_and_identity.sql','de85c67296421c95ac8c1c5d099468476165d5ea16d9e364fcceb280f3c2db5e') ON CONFLICT(version) DO NOTHING;

-- 002_students_and_inquiries.sql
BEGIN;
DO $$ BEGIN CREATE TYPE student_status AS ENUM ('active','completed','left'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE inquiry_status AS ENUM ('new','contacted','converted','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id varchar(40) NOT NULL UNIQUE,
  display_name varchar(120) NOT NULL, course_name varchar(160) NOT NULL, batch_name varchar(120) NOT NULL DEFAULT '',
  status student_status NOT NULL DEFAULT 'active', admission_date date NOT NULL,
  total_fee_paise bigint NOT NULL CHECK(total_fee_paise >= 0), paid_paise bigint NOT NULL CHECK(paid_paise >= 0),
  next_installment_date date, next_installment_paise bigint CHECK(next_installment_paise IS NULL OR next_installment_paise >= 0),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(paid_paise <= total_fee_paise)
);
ALTER TABLE app_users ADD CONSTRAINT fk_app_users_student FOREIGN KEY(student_record_id) REFERENCES students(id) ON DELETE RESTRICT;
CREATE TABLE inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_no varchar(40) NOT NULL UNIQUE,
  name varchar(100) NOT NULL, mobile varchar(16) NOT NULL, course varchar(100) NOT NULL, message varchar(500) NOT NULL DEFAULT '',
  consent boolean NOT NULL CHECK(consent), status inquiry_status NOT NULL DEFAULT 'new', assigned_to uuid REFERENCES app_users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(mobile ~ '^\\+?[0-9]{10,15}$')
);
CREATE INDEX idx_inquiries_admin_list ON inquiries(status,created_at DESC);
CREATE INDEX idx_students_admin_list ON students(status,display_name);
COMMIT;

INSERT INTO schema_migrations(version,checksum) VALUES('002_students_and_inquiries.sql','3551fca6ad3cfefab2b8bc37c3eb25881e32484e7a7b9f976c88928f6ea8d247') ON CONFLICT(version) DO NOTHING;

-- 003_security_state.sql
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

INSERT INTO schema_migrations(version,checksum) VALUES('003_security_state.sql','ff08ce7239128e7f7301c53df997233a490dd7c82ab427276ff74d0be846944a') ON CONFLICT(version) DO NOTHING;

-- 004_immutable_audit.sql
BEGIN;
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, event_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  occurred_at timestamptz NOT NULL DEFAULT now(), actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  actor_role user_role, action varchar(80) NOT NULL, entity_type varchar(80) NOT NULL, entity_id varchar(120) NOT NULL DEFAULT '',
  request_id varchar(80) NOT NULL, ip_hash char(64), outcome varchar(20) NOT NULL CHECK(outcome IN('success','failure')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_audit_entity ON audit_events(entity_type,entity_id,occurred_at DESC);
CREATE INDEX idx_audit_actor ON audit_events(actor_user_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events are append-only'; END $$;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
COMMIT;

INSERT INTO schema_migrations(version,checksum) VALUES('004_immutable_audit.sql','09eef28b94672817fb7a63ba8d406acffa91ec2390cae506656830ff15f68861') ON CONFLICT(version) DO NOTHING;

-- 006_admin_role_migration.sql
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

INSERT INTO schema_migrations(version,checksum) VALUES('006_admin_role_migration.sql','2da69480c9d0aa9ef99bcf29b6e0d55ec1a0913d7fb1cf382ac26548933526f1') ON CONFLICT(version) DO NOTHING;

-- 007_student_profile_fields.sql
BEGIN;
-- Read/profile fields already present in the synthetic Student Portal.
-- Nullable for existing records; financial columns and histories are untouched.
ALTER TABLE students ADD COLUMN IF NOT EXISTS mobile varchar(16);
ALTER TABLE students ADD COLUMN IF NOT EXISTS email varchar(254);
ALTER TABLE students ADD COLUMN IF NOT EXISTS address varchar(500);
ALTER TABLE students ADD COLUMN IF NOT EXISTS session_name varchar(120);
ALTER TABLE students ADD COLUMN IF NOT EXISTS course_end_date date;
CREATE INDEX IF NOT EXISTS idx_students_management_filters ON students(status,course_name,session_name,batch_name,admission_date);
COMMIT;

INSERT INTO schema_migrations(version,checksum) VALUES('007_student_profile_fields.sql','6ac4cf3ea245431918bdbd8d4e9ba431fadb13f91c4c79f00c11179a39afb26d') ON CONFLICT(version) DO NOTHING;

-- 008_admission_workflow.sql
BEGIN;
CREATE TABLE admission_numbering(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),prefix varchar(24) NOT NULL DEFAULT 'CC-' CHECK(length(prefix)>0),next_number bigint NOT NULL DEFAULT 1 CHECK(next_number>=1));
INSERT INTO admission_numbering(singleton) VALUES(true);
-- Authoritative reference configuration is provisioned separately; no LAN records are imported.
CREATE TABLE admission_courses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(160) NOT NULL UNIQUE,code varchar(80) NOT NULL,duration varchar(100) NOT NULL DEFAULT '',fee_paise bigint NOT NULL CHECK(fee_paise>=0));
CREATE TABLE admission_batches(batch_name varchar(120) PRIMARY KEY,capacity integer NOT NULL DEFAULT 15 CHECK(capacity>=1));
CREATE UNIQUE INDEX admission_batch_case_unique ON admission_batches(upper(trim(batch_name)));
ALTER TABLE students ADD COLUMN admission_details jsonb NOT NULL DEFAULT '{}';
ALTER TABLE inquiries ADD COLUMN student_record_id uuid UNIQUE REFERENCES students(id);
CREATE UNIQUE INDEX students_code_case_unique ON students(upper(student_id));
CREATE TABLE admission_installments(student_id uuid NOT NULL REFERENCES students(id),installment_no integer NOT NULL CHECK(installment_no>=1),due_date date NOT NULL,amount_paise bigint NOT NULL CHECK(amount_paise>0),remark varchar(500) NOT NULL DEFAULT '',PRIMARY KEY(student_id,installment_no));
CREATE TABLE admission_requests(request_key varchar(200) PRIMARY KEY,request_hash varchar(64) NOT NULL,response jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
COMMIT;

INSERT INTO schema_migrations(version,checksum) VALUES('008_admission_workflow.sql','8222d81ae98ac267ca6887527d341b5bf58825e43f31f824600b91b0fb6c3b68') ON CONFLICT(version) DO NOTHING;

