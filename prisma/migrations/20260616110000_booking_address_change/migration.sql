-- Migration: booking_address_change
-- Adds the post-payment "change delivery address" sub-flow columns to bookings.
--
-- A renter may request an address change AFTER payment (booking.status =
-- 'confirmed'). The shop must approve it and may set a new shipping fee; if the
-- new fee is higher the renter pays the positive difference (uploads a slip)
-- before the new address takes effect. The booking's main `status` is NOT
-- touched — this sub-flow is tracked entirely in the columns below:
--
--   addr_change_status: null/none -> requested -> approved -> paid_review -> done
--                       (or -> rejected at the shop's discretion)
--
-- All columns are additive + nullable on the existing `bookings` table, which is
-- already granted to the app role, so NO GRANT is needed (new columns inherit
-- table grants). create-only — NEVER run prisma migrate against a real DB by hand.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "addr_change_status"      TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pending_recipient_name"  TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pending_phone"           TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pending_address_text"    TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pending_shipping_fee"    INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "addr_change_diff"        INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "addr_change_slip_path"   TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "addr_change_reason"      TEXT;
