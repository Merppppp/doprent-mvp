-- Migration: occasion_chip_tags
-- Adds 3 NEW occasion tags (thai, graduation, costume) so the navbar's
-- clothing sub-category chips map to real occasion tags instead of the broken
-- `?cat=` param. Reference-data only — NEW ROWS in the existing "tags" table
-- (no new tables/columns, no new GRANTs needed; "tags" is already granted to
-- the app role). create-only — NEVER run prisma migrate against a real DB.
--
-- Rationale: evening/wedding/casual already exist as occasion tags; these 3
-- complete the navbar chip set. Idempotent via ON CONFLICT on the unique key.

INSERT INTO "tags"
  ("id", "tag_group_id", "key", "label", "is_active", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  tg.id,
  v."key",
  v."label",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "tag_groups" tg
CROSS JOIN (VALUES
  ('thai',       'ชุดไทย'),
  ('graduation', 'รับปริญญา'),
  ('costume',    'คอสตูม/แฟนซี')
) AS v("key", "label")
WHERE tg."key" = 'occasion'
ON CONFLICT ("key") DO NOTHING;
