-- Timestamp marking when a booking entered the `payment_review` state (renter
-- uploaded their payment slip). Used as the start point for the shop-open-hours
-- escalation timer: if ≥ PAYMENT_REVIEW_ESCALATE_OPEN_HOURS of shop-open time
-- have elapsed the seller sees an urgent "ตรวจสลิปด่วน" badge.
-- Nullable; reset each time the renter re-submits a slip (e.g. after slip_disputed).

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_review_at" TIMESTAMPTZ(6);

-- Backfill existing payment_review bookings so they get a non-null value.
-- updated_at approximates the transition time closely enough for existing rows.
UPDATE "bookings" SET "payment_review_at" = "updated_at"
  WHERE "status" = 'payment_review' AND "payment_review_at" IS NULL;
