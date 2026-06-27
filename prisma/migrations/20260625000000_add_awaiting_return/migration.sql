-- Adds the 'awaiting_return' BookingStatus value.
-- Lifecycle: renting → awaiting_return (auto at 00:00 of the rental's last day)
--            → returned (seller confirms physical return).
-- awaiting_return still occupies the dress's dates (it's an ACTIVE/BLOCKING
-- status in lib/bookings.ts + lib/booking-policy.ts) — the unit is not free
-- until the seller marks it returned.

ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'awaiting_return' AFTER 'renting';
