-- Add 'renting' to booking_status enum
ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'renting' AFTER 'confirmed';

-- Add cancelled_by column to track who cancelled
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_by" TEXT;

-- Backfill cancelled_by for existing cancelled/rejected bookings
UPDATE "bookings" SET "cancelled_by" = 'shop'
  WHERE "status" IN ('rejected', 'cancel_requested') AND "cancelled_by" IS NULL;
UPDATE "bookings" SET "cancelled_by" = 'system'
  WHERE "status" = 'payment_expired' AND "cancelled_by" IS NULL;
UPDATE "bookings" SET "cancelled_by" = 'renter'
  WHERE "status" = 'cancelled' AND "cancelled_by" IS NULL;
