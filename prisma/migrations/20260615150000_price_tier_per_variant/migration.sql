-- Add variant_id column (nullable) to product_price_tiers
ALTER TABLE product_price_tiers ADD COLUMN variant_id uuid;

-- Add FK constraint: variant_id -> product_variants.id (CASCADE DELETE and UPDATE)
ALTER TABLE product_price_tiers
  ADD CONSTRAINT product_price_tiers_variant_id_fkey
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the old unique on (product_id, min_days) — it may exist as a constraint OR a plain index
-- (Prisma's older @@unique was emitted as a unique index on dev). Drop both forms to be safe.
ALTER TABLE product_price_tiers
  DROP CONSTRAINT IF EXISTS product_price_tiers_product_id_min_days_key;
DROP INDEX IF EXISTS product_price_tiers_product_id_min_days_key;

-- Create new unique index: (product_id, variant_id, min_days)
CREATE UNIQUE INDEX product_price_tiers_product_id_variant_id_min_days_key
  ON product_price_tiers(product_id, variant_id, min_days);
