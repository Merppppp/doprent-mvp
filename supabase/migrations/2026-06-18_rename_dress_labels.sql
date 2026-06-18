-- ===========================================================
-- DopRent — Rename "ชุดเดรส" → "ชุดเสื้อผ้า" labels (2026-06-18)
-- Data-only patch (NO schema change). Renames the generic apparel
-- ProductType + its root ProductCategory display labels.
--   key values are UNCHANGED ("dress" / "dress-all") — only labels.
-- WHY a manual SQL: prisma/seed.ts upserts use `update: {}`, so re-seeding
--   does NOT update existing rows on an already-seeded env.
-- Safe to re-run (idempotent — matches on stable key).
-- Skip on a fresh/empty DB: the first `prisma db seed` already inserts
--   the new labels, so these UPDATEs simply affect 0 rows.
-- ===========================================================

UPDATE product_types
   SET label = 'ชุดเสื้อผ้า'
 WHERE key = 'dress';

UPDATE product_categories
   SET label = 'ชุดเสื้อผ้าทั้งหมด'
 WHERE key = 'dress-all';

-- Verify (optional):
--   SELECT key, label FROM product_types WHERE key = 'dress';
--   SELECT key, label FROM product_categories WHERE key = 'dress-all';
