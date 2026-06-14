-- Migration: 20260615120000_product_variants
-- Create-only (never run prisma migrate / db-push against real DB).
-- DBA applies GRANT on product_variants separately (uat/prod standard pattern).
--
-- What this does:
--   1. CREATE TABLE product_variants (uuid PK, productId FK, size enum,
--      quantity, price_per_day, deposit, available, audit cols)
--   2. ALTER bookings ADD COLUMN variant_id uuid NULL (FK to product_variants,
--      inherits existing bookings privilege — no new GRANT needed)
--   3. Backfill: one variant per product with {size, quantity=1,
--      pricePerDay=product.price_per_day, deposit=product.deposit,
--      available=product.available}
--   4. Backfill bookings.variant_id = the variant matching bookings.product.size
--
-- KEEP Product.size column (back-compat, not dropped here).
-- No enum value additions — uses existing "size" enum ('XS','S','M','L','XL').
-- No privilege statements — DBA grants SELECT/INSERT/UPDATE/DELETE on
-- product_variants to the *_app role on uat/prod.

-- ── 1. CREATE TABLE product_variants ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "product_id"   UUID         NOT NULL,
  "size"         "size"       NOT NULL,
  "quantity"     INTEGER      NOT NULL DEFAULT 1,
  "price_per_day" INTEGER     NOT NULL,
  "deposit"      INTEGER      NOT NULL DEFAULT 0,
  "available"    BOOLEAN      NOT NULL DEFAULT true,
  "created_by"   UUID,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by"   UUID,
  "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variants_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE,
  CONSTRAINT "product_variants_product_id_size_key"
    UNIQUE ("product_id", "size")
);

CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx"
  ON "product_variants" ("product_id");

COMMENT ON TABLE "product_variants" IS 'stock ต่อไซซ์ของสินค้า — 1 ดีไซน์หลายไซซ์ แต่ละไซซ์มีจำนวน (quantity) หน่วย';
COMMENT ON COLUMN "product_variants"."quantity"     IS 'จำนวนหน่วยทางกายภาพที่ร้านมีในไซซ์นี้';
COMMENT ON COLUMN "product_variants"."price_per_day" IS 'ราคาเช่าต่อวันของไซซ์นี้ (บาท)';
COMMENT ON COLUMN "product_variants"."deposit"      IS 'ค่ามัดจำของไซซ์นี้ (บาท)';
COMMENT ON COLUMN "product_variants"."available"    IS 'เปิดให้จองไซซ์นี้';

-- ── 2. ALTER TABLE bookings ADD COLUMN variant_id ────────────────────────────

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "variant_id" UUID;

ALTER TABLE "bookings"
  DROP CONSTRAINT IF EXISTS "bookings_variant_id_fkey";

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE SET NULL;

COMMENT ON COLUMN "bookings"."variant_id" IS 'FK → product_variants.id ไซซ์ที่จอง (nullable — null = legacy booking)';

-- ── 3. Backfill: one variant per existing product ────────────────────────────
-- For each product, INSERT a ProductVariant inheriting {size, price_per_day,
-- deposit, available} from the product itself (quantity = 1 = MVP default).
-- ON CONFLICT DO NOTHING in case this migration is replayed.

INSERT INTO "product_variants"
  ("id", "product_id", "size", "quantity", "price_per_day", "deposit", "available",
   "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  p."id",
  p."size",
  1                  AS quantity,
  p."price_per_day",
  p."deposit",
  p."available",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "products" p
ON CONFLICT ("product_id", "size") DO NOTHING;

-- ── 4. Backfill bookings.variant_id ─────────────────────────────────────────
-- Match each existing booking to the variant for its product's size.
-- variant_id stays NULL for any booking whose product has no matching variant
-- (edge case — the INSERT above covers all active products).

UPDATE "bookings" b
SET "variant_id" = pv."id"
FROM "product_variants" pv
JOIN "products" p ON p."id" = pv."product_id"
WHERE b."product_id" = p."id"
  AND pv."size"       = p."size"
  AND b."variant_id" IS NULL;
