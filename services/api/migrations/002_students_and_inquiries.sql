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
