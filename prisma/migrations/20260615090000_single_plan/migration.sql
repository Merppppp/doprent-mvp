-- Migration: single_plan
-- MVP simplification: add the 'full' value to the plan_tier enum and make it
-- the default for new shops. Existing shops keep their current tier value;
-- the UI no longer surfaces a plan choice. create-only — NEVER run prisma
-- migrate against a real DB; apply via Supabase SQL Editor or psql.
--
-- No new GRANTs needed: the shops table is already granted to the app role.

-- Extend the enum with the new 'full' tier (idempotent via IF NOT EXISTS).
-- NOTE: a newly added enum value cannot be USED in the same transaction it is
-- added (Postgres 55P04). The shops.ads_tier default that uses 'full' therefore
-- lives in the SEPARATE follow-up migration 20260615090300_single_plan_default.
ALTER TYPE "plan_tier" ADD VALUE IF NOT EXISTS 'full';
