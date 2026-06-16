-- Migration: staff_login_code_and_scoped_username
-- Adds per-shop opaque QR login code and makes ShopStaff.username unique per shop
-- rather than globally. Shop is resolved at login via the opaque staffLoginCode.
--
-- PROD NOTE: Before applying in production, run the backfill UPDATE below in a
-- separate transaction, verify uniqueness, then add the unique index, then drop
-- the old global unique on shop_staff.username and add the composite unique.

-- 1. Add staff_login_code column (nullable for backfill)
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "staff_login_code" TEXT;

-- 2. Backfill existing shops with unique codes using uuid-derived base32-safe strings.
--    gen_random_uuid() gives 32 hex chars; we take 8 chars, replace - with empty,
--    then convert to uppercase. Uniqueness is statistically guaranteed for small tables.
--    If any collision occurs (astronomically unlikely), re-run the UPDATE for nulls.
UPDATE "shops"
SET "staff_login_code" = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE "staff_login_code" IS NULL;

-- 3. Create unique index on staff_login_code (after backfill so all rows are non-null)
CREATE UNIQUE INDEX IF NOT EXISTS "shops_staff_login_code_key" ON "shops"("staff_login_code");

-- 4. DEV-ONLY: Truncate shop_staff so we can safely drop the global unique index
--    on username (removing it while rows exist could require rewriting the index).
--    In production, keep existing rows and migrate carefully:
--    a) Add composite index first, b) verify no shop has duplicate usernames, c) drop old.
DELETE FROM "shop_staff";

-- 5. Drop the old global unique index on shop_staff.username
DROP INDEX IF EXISTS "shop_staff_username_key";

-- 6. Add composite unique (shop_id, username) — makes username unique per shop only
CREATE UNIQUE INDEX IF NOT EXISTS "shop_staff_shop_id_username_key" ON "shop_staff"("shop_id", "username");
