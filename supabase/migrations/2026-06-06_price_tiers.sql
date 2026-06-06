-- ===========================================================
-- DopRent — Duration-based pricing tiers (2026-06-06)
-- Adds optional per-dress price_tiers. NULL = use flat price_per_day.
-- Safe to re-run.
-- ===========================================================
-- Shape: jsonb array of { "min": int, "max": int|null, "per_day": int }
--   contiguous from day 1, last tier open-ended (max = null).
--   e.g. [{"min":1,"max":2,"per_day":250},{"min":3,"max":4,"per_day":200},
--         {"min":5,"max":null,"per_day":175}]
alter table dresses
  add column if not exists price_tiers jsonb;

-- price_per_day stays as the base / fallback / "from" price (cards + filters).
-- No backfill needed: existing rows keep price_tiers = NULL and price as-is.
