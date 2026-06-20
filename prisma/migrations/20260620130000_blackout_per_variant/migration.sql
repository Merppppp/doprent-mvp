-- Add variant_id column to product_blackout_dates
ALTER TABLE "product_blackout_dates" ADD COLUMN IF NOT EXISTS "variant_id" UUID;

-- Add FK constraint
ALTER TABLE "product_blackout_dates"
  ADD CONSTRAINT "product_blackout_dates_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old unique constraint (product_id, date) and replace with (product_id, variant_id, date)
-- The old constraint name may vary; drop by column definition
ALTER TABLE "product_blackout_dates" DROP CONSTRAINT IF EXISTS "product_blackout_dates_product_id_date_key";

-- New unique: allows NULL variant_id (product-wide) + specific variant_id per date
CREATE UNIQUE INDEX "product_blackout_dates_product_id_variant_id_date_key"
  ON "product_blackout_dates" ("product_id", "variant_id", "date");

-- For product-wide blackouts (variant_id IS NULL), ensure uniqueness separately
CREATE UNIQUE INDEX "product_blackout_dates_product_wide_date_key"
  ON "product_blackout_dates" ("product_id", "date")
  WHERE "variant_id" IS NULL;

-- Index on variant_id for fast lookups
CREATE INDEX IF NOT EXISTS "product_blackout_dates_variant_id_idx"
  ON "product_blackout_dates" ("variant_id");
