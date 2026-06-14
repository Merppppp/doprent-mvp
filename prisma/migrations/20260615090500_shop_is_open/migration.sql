-- Migration: shop_is_open
-- Adds a manual open/close toggle to the shops table so sellers can pause
-- their shop without fully unpublishing it. create-only — NEVER run prisma
-- migrate against a real DB; apply via Supabase SQL Editor or psql.
--
-- No new GRANTs needed: ADD COLUMN inherits the existing table grants.

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "is_open" BOOLEAN NOT NULL DEFAULT true;
