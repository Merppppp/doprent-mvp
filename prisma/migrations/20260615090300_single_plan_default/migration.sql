-- Migration: single_plan_default
-- Follow-up to 20260615090000_single_plan. The 'full' enum value was added there;
-- it can only be USED (referenced) in a LATER transaction (Postgres 55P04), so the
-- default change lives here in its own migration. create-only — NEVER run prisma
-- migrate against a real DB.
--
-- No new GRANTs needed: the shops table is already granted to the app role.

ALTER TABLE "shops" ALTER COLUMN "ads_tier" SET DEFAULT 'full';
