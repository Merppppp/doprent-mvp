-- Migration: shop_bankbook_image
-- Adds shops.bankbook_image_path — the PRIVATE bucket object key for the
-- bankbook (passbook cover) photo a shop attaches when it provides a bank
-- account number. Admins review it via a short-lived signed URL.
--
-- Additive nullable column on an existing table — no GRANT needed (the shops
-- table is already granted to the app role; new columns inherit table grants).
-- create-only — NEVER run prisma migrate against a real DB by hand.

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bankbook_image_path" TEXT;
