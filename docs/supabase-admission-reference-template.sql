-- Run only after migration 008 on the dedicated FMS Web Supabase project.
-- Replace the examples with approved Web admission configuration; do not import FMS LAN students.

INSERT INTO admission_courses (name, code, duration, fee_paise)
VALUES
  ('Replace with approved course name', 'REPLACE-001', '3 months', 0)
ON CONFLICT (name) DO UPDATE
SET code = EXCLUDED.code, duration = EXCLUDED.duration, fee_paise = EXCLUDED.fee_paise;

INSERT INTO admission_batches (batch_name, capacity)
VALUES
  ('Morning 08:00', 15)
ON CONFLICT (batch_name) DO UPDATE SET capacity = EXCLUDED.capacity;

-- LAN source default is CC-. Change only after owner-approved confirmation.
UPDATE admission_numbering SET prefix = 'CC-' WHERE singleton = true;
