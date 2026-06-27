-- Timestamp marking when a booking entered the `returned` state (seller
-- confirmed the dress is physically back). Used as the start point for the
-- auto-complete sweep: returned → completed after AUTO_COMPLETE_AFTER_RETURN_DAYS.
-- Nullable; only set on the returned transition.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "returned_at" TIMESTAMPTZ(6);

-- Backfill existing returned bookings so they're not stuck out of the
-- auto-complete sweep. updated_at approximates the return time closely enough.
UPDATE "bookings" SET "returned_at" = "updated_at"
  WHERE "status" = 'returned' AND "returned_at" IS NULL;
