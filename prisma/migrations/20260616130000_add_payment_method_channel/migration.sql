-- Migration: add_payment_method_channel
-- Adds a per-shop default payment channel and a per-booking chosen channel
-- snapshot, supporting the feature where a shop with BOTH PromptPay + bank can
-- pick which channel to collect through (default in shop settings, re-choosable
-- at booking acceptance), and the renter sees only the chosen channel.
--
-- New enum `payment_method` (promptpay | bank).
-- Additive nullable columns on existing tables (shops, bookings) — no GRANT
-- needed (those tables are already granted to the app role; new columns inherit
-- table grants). Enum type usage likewise inherits.
-- create-only — NEVER run prisma migrate against a real DB by hand.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE "payment_method" AS ENUM ('promptpay', 'bank');
  END IF;
END
$$;

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "default_payment_method" "payment_method";
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_method" "payment_method";
