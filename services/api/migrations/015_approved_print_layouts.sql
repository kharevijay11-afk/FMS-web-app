BEGIN;
ALTER TABLE certificates ALTER COLUMN print_status SET DEFAULT 'layout-ready';
UPDATE certificates SET print_status='layout-ready' WHERE print_status='layout-pending';
ALTER TABLE id_card_issues ALTER COLUMN print_layout_status SET DEFAULT 'approved-layout-ready';
UPDATE id_card_issues SET print_layout_status='approved-layout-ready' WHERE print_layout_status='authoritative-layout-pending';
COMMIT;
