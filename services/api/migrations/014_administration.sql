BEGIN;
CREATE TABLE institute_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id),institute_name varchar(160) NOT NULL DEFAULT 'Create Computer',address varchar(500),phone varchar(20),email varchar(254),student_prefix varchar(20) NOT NULL DEFAULT 'CC-',receipt_prefix varchar(20) NOT NULL DEFAULT 'FMS-',version integer NOT NULL DEFAULT 1 CHECK(version>=1),updated_by uuid REFERENCES app_users(id),updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO institute_settings(id) VALUES(true);
CREATE TABLE institute_settings_revisions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,version integer NOT NULL,previous_record jsonb NOT NULL,changed_by uuid REFERENCES app_users(id),changed_at timestamptz NOT NULL DEFAULT now());
COMMIT;
