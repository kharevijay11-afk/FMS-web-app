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
