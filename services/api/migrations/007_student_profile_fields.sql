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
