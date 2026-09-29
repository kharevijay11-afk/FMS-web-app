BEGIN;
CREATE TABLE legacy_import_metadata(
  entity_type varchar(40) NOT NULL,
  entity_id uuid NOT NULL,
  source_system varchar(40) NOT NULL DEFAULT 'cfm-desktop',
  source_id varchar(120),
  quarantined_fields jsonb NOT NULL DEFAULT '{}',
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(entity_type,entity_id)
);
COMMIT;
