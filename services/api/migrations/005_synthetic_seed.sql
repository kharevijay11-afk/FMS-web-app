BEGIN;
-- Development/test only. The migration runner refuses this file in production.
WITH s AS (
  INSERT INTO students(id,student_id,display_name,course_name,batch_name,status,admission_date,total_fee_paise,paid_paise,next_installment_date,next_installment_paise)
  VALUES('10000000-0000-4000-8000-000000000001','STU-DEMO-001','Aarav Demo','Diploma in Computer Applications','Morning 08:00','active','2026-07-01',1800000,750000,'2026-10-01',300000)
  ON CONFLICT(student_id) DO NOTHING RETURNING id
) SELECT 1;
-- Password records are inserted by `npm run seed` so scrypt is never replaced by SQL hashing.
COMMIT;
