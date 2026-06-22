-- Add source and internal_note columns to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "internal_note" TEXT;

-- Backfill existing bookings as online
UPDATE "bookings" SET "source" = 'online' WHERE "source" IS NULL;
