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
