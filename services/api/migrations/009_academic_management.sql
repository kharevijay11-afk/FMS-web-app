BEGIN;
ALTER TABLE admission_courses ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive'));
ALTER TABLE admission_courses ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK(version>=1);
ALTER TABLE admission_batches ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK(version>=1);
CREATE TABLE IF NOT EXISTS academic_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(160) NOT NULL UNIQUE,start_date date NOT NULL,end_date date NOT NULL,status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),version integer NOT NULL DEFAULT 1 CHECK(version>=1),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(start_date<=end_date));
COMMIT;
