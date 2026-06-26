-- Regenerate ProductUnit.code to the schema-intended format <slug>-<size>-NNN.
-- Earlier backfill produced generic <size>-NNN codes that were not unique or
-- identifiable per product. Numbering is per-variant, deterministic (orders by
-- existing code then created_at), so each variant keeps a stable 001..N sequence.
WITH numbered AS (
  SELECT u.id,
         p.slug AS slug,
         v."size"::text AS size,
         row_number() OVER (
           PARTITION BY u.variant_id
           ORDER BY u.code, u.created_at, u.id
         ) AS n
  FROM product_units u
  JOIN product_variants v ON v.id = u.variant_id
  JOIN products p ON p.id = v.product_id
)
UPDATE product_units u
SET code = numbered.slug || '-' || numbered.size || '-' || lpad(numbered.n::text, 3, '0')
FROM numbered
WHERE numbered.id = u.id;
