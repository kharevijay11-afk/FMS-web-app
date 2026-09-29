BEGIN;
CREATE SEQUENCE receipt_number_seq;
CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid NOT NULL REFERENCES students(id),receipt_number varchar(80) NOT NULL UNIQUE,payment_date date NOT NULL,amount_paise bigint NOT NULL CHECK(amount_paise>0),mode varchar(40) NOT NULL,reference varchar(120),status varchar(16) NOT NULL DEFAULT 'posted' CHECK(status IN('posted','reversed')),version integer NOT NULL DEFAULT 1 CHECK(version>=1),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),reversed_at timestamptz);
CREATE INDEX payments_student_date_idx ON payments(student_id,payment_date,id);
CREATE TABLE payment_revisions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,payment_id uuid NOT NULL REFERENCES payments(id),version integer NOT NULL,previous_record jsonb NOT NULL,changed_at timestamptz NOT NULL DEFAULT now(),changed_by uuid REFERENCES app_users(id));
COMMIT;
