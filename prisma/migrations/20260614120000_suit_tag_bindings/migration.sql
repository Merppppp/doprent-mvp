-- Migration: suit_tag_bindings
-- Binds the existing "occasion" and "color" tag groups to the "suit" product type.
-- Reference-data only — NEW ROWS in product_type_tag_groups (no new tables/columns,
-- no new GRANTs needed; the table is already granted to the app role). create-only —
-- NEVER run prisma migrate against a real DB.
--
-- Rationale: occasion (โอกาสใช้งาน) and color (สี) apply to any clothing item, so suit
-- (สูท) gets both. dress-type (ประเภทชุด) is intentionally NOT bound — its values are
-- dress-specific. Requiredness stays per-binding (is_required=false here).
--
-- What this does (idempotent):
--   1. bind suit × occasion  (sort_order=0, multi, not required)
--   2. bind suit × color     (sort_order=1, multi, not required)

INSERT INTO "product_type_tag_groups"
  ("id", "product_type_id", "tag_group_id", "sort_order", "is_required", "selection_mode", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), pt.id, tg.id, v."sort_order", false, 'multi', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "product_types" pt
CROSS JOIN (VALUES
  ('occasion', 0),
  ('color',    1)
) AS v("group_key", "sort_order")
JOIN "tag_groups" tg ON tg."key" = v."group_key"
WHERE pt."key" = 'suit'
ON CONFLICT ("product_type_id", "tag_group_id") DO NOTHING;
