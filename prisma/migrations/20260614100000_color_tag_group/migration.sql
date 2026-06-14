-- Migration: color_tag_group
-- Reference-data seed + binding for the 'color' dynamic tag group.
-- create-only — NEVER run prisma migrate against real DB.
--
-- What this does:
--   a. ADD COLUMN swatch_hex / swatch_image_url to "tags"
--   b. ALTER "products"."color" to be nullable
--   c. INSERT the "color" TagGroup (สี, sort_order=2)
--   d. INSERT 8 color Tags (with swatch_hex from COLOR_SWATCH in lib/types.ts)
--   e. INSERT the binding: dress × color (sort_order=2, multi, not required)
--   f. BACKFILL: copy existing products.color into product_tags

-- ── a. Schema changes: swatch columns on "tags" ─────────────────────────────

ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "swatch_hex" TEXT;
COMMENT ON COLUMN "tags"."swatch_hex" IS 'สีตัวอย่าง hex ใช้เฉพาะแท็กกลุ่ม color (เช่น #D9A4A0) — NULL ถ้ากลุ่มอื่น';

ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "swatch_image_url" TEXT;
COMMENT ON COLUMN "tags"."swatch_image_url" IS 'รูป swatch สำหรับสีลาย/พื้นผิว — NULL ถ้าใช้ swatch_hex แทน';

-- ── b. Make products.color nullable ─────────────────────────────────────────

ALTER TABLE "products" ALTER COLUMN "color" DROP NOT NULL;

-- ── c. TagGroup: color ───────────────────────────────────────────────────────

INSERT INTO "tag_groups"
  ("id", "key", "label", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'color', 'สี', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ── d. Tags (8 colors) — hex values from COLOR_SWATCH in lib/types.ts ───────

INSERT INTO "tags"
  ("id", "tag_group_id", "key", "label", "swatch_hex", "is_active", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  tg.id,
  v."key",
  v."label",
  v."hex",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "tag_groups" tg
CROSS JOIN (VALUES
  ('rose',   'กุหลาบ',  '#D9A4A0'),
  ('ivory',  'งาช้าง',  '#EFE3CC'),
  ('green',  'เขียว',   '#2F6F4E'),
  ('black',  'ดำ',      '#1A1815'),
  ('navy',   'กรมท่า',  '#1F2A4A'),
  ('red',    'แดง',     '#B5302C'),
  ('blue',   'ฟ้า',     '#7BA8C9'),
  ('purple', 'ม่วง',    '#A48BC4')
) AS v("key", "label", "hex")
WHERE tg."key" = 'color'
ON CONFLICT ("key") DO NOTHING;

-- ── e. Binding: dress product_type × color tag_group ────────────────────────

INSERT INTO "product_type_tag_groups"
  ("id", "product_type_id", "tag_group_id", "sort_order", "is_required", "selection_mode", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), pt.id, tg.id, 2, false, 'multi', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "product_types" pt
CROSS JOIN "tag_groups" tg
WHERE pt."key" = 'dress'
  AND tg."key" = 'color'
ON CONFLICT ("product_type_id", "tag_group_id") DO NOTHING;

-- ── f. Backfill: products.color → product_tags ───────────────────────────────
-- For every product that already has a color value, insert the matching tag.
-- t.key = lowercase color enum value (rose, ivory, green, …); must match Tag.key exactly.

INSERT INTO "product_tags"
  ("id", "product_id", "tag_id", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  p.id,
  t.id,
  now(),
  now()
FROM "products" p
JOIN "tags" t ON t."key" = p."color"::text
JOIN "tag_groups" tg ON tg.id = t."tag_group_id" AND tg."key" = 'color'
WHERE p."color" IS NOT NULL
ON CONFLICT ("product_id", "tag_id") DO NOTHING;
