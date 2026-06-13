-- Migration: dress_type_tag_group
-- Reference-data seed + binding — NEW ROWS only (no new tables, no new GRANTs needed;
-- tag_groups, tags, and product_type_tag_groups are already granted to the app role
-- by earlier migrations). create-only — NEVER run prisma migrate against real DB.
--
-- What this does:
--   1. INSERT the "dress-type" TagGroup (ประเภทชุด, sort_order=1)
--   2. INSERT its 16 Tags (flat group, multi-select)
--   3. INSERT the binding row into product_type_tag_groups
--      (dress product_type × dress-type tag_group, sort_order=1, multi, not required)

-- ── 1. TagGroup: dress-type ───────────────────────────────────────────────────

INSERT INTO "tag_groups"
  ("id", "key", "label", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'dress-type', 'ประเภทชุด', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ── 2. Tags (16) — resolved via sub-select on tag_group_id ───────────────────

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
  ('long-sleeve',     'แขนยาว'),
  ('short-sleeve',    'แขนสั้น'),
  ('sleeveless',      'แขนกุด'),
  ('spaghetti-strap', 'สายเดี่ยว'),
  ('off-shoulder',    'ปาดไหล่'),
  ('strapless',       'เกาะอก'),
  ('outerwear',       'เสื้อคลุม'),
  ('turtleneck-coat', 'คอเต่า/เสื้อโค้ท'),
  ('jacket',          'แจ็คเก็ต'),
  ('sheer',           'ชีทรู'),
  ('long-skirt',      'กระโปรงยาว'),
  ('short-skirt',     'กระโปรงสั้น'),
  ('long-pants',      'กางเกงขายาว'),
  ('short-pants',     'กางเกงขาสั้น'),
  ('long-dress',      'เดรสยาว'),
  ('short-dress',     'เดรสสั้น')
) AS v("key", "label")
WHERE tg."key" = 'dress-type'
ON CONFLICT ("key") DO NOTHING;

-- ── 3. Binding: dress product_type × dress-type tag_group ────────────────────

INSERT INTO "product_type_tag_groups"
  ("id", "product_type_id", "tag_group_id", "sort_order", "is_required", "selection_mode", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), pt.id, tg.id, 1, false, 'multi', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "product_types" pt
CROSS JOIN "tag_groups" tg
WHERE pt."key" = 'dress'
  AND tg."key" = 'dress-type'
ON CONFLICT ("product_type_id", "tag_group_id") DO NOTHING;
