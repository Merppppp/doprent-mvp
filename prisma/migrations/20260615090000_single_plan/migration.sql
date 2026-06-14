-- Migration: single_plan
-- MVP simplification: add the 'full' value to the plan_tier enum and make it
-- the default for new shops. Existing shops keep their current tier value;
-- the UI no longer surfaces a plan choice. create-only — NEVER run prisma
-- migrate against a real DB; apply via Supabase SQL Editor or psql.
--
-- No new GRANTs needed: the shops table is already granted to the app role.

-- 1. Extend the enum with the new 'full' tier (idempotent via IF NOT EXISTS)
ALTER TYPE "plan_tier" ADD VALUE IF NOT EXISTS 'full';

-- 2. Change the default on shops.ads_tier so new shops default to 'full'
ALTER TABLE "shops" ALTER COLUMN "ads_tier" SET DEFAULT 'full';
