-- Ensure pg_trgm extension is available
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Restore trigram GIN indexes for search (dropped by prior migration drift)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_designer_trgm
  ON products USING gin (designer gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON products USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_shops_name_trgm
  ON shops USING gin (name gin_trgm_ops);

-- New: trigram indexes on tags (searched in getTrigamRankedIds)
CREATE INDEX IF NOT EXISTS idx_tags_label_trgm
  ON tags USING gin (label gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tags_key_trgm
  ON tags USING gin (key gin_trgm_ops);

-- Restore unique constraint on blackout dates
CREATE UNIQUE INDEX IF NOT EXISTS product_blackout_dates_product_id_date_key
  ON product_blackout_dates (product_id, date);
