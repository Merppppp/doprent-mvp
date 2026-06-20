-- AlterTable: add delivery method fields to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "delivery_method" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "delivery_carrier" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "express_slot" TEXT;
