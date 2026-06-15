-- Add variant_id column (nullable) to product_price_tiers
ALTER TABLE product_price_tiers ADD COLUMN variant_id uuid;

-- Add FK constraint: variant_id -> product_variants.id (CASCADE DELETE and UPDATE)
ALTER TABLE product_price_tiers
  ADD CONSTRAINT product_price_tiers_variant_id_fkey
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the old unique constraint (product_id, min_days)
ALTER TABLE product_price_tiers
  DROP CONSTRAINT IF EXISTS product_price_tiers_product_id_min_days_key;

-- Create new unique index: (product_id, variant_id, min_days)
CREATE UNIQUE INDEX product_price_tiers_product_id_variant_id_min_days_key
  ON product_price_tiers(product_id, variant_id, min_days);
