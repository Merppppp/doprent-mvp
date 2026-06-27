-- Refund tracking fields on bookings — added when cancel-after-payment flow
-- was introduced. All columns nullable: existing rows get default values.
--
-- refund_status: "none" (default, no refund), "required" (admin approved cancel
--   after payment was made — admin must execute the transfer), "refunded" (done).
-- refund_amount: THB amount the admin entered at cancel-approval time (manual, per-case).
-- refunded_at: timestamp when admin recorded the refund (slip uploaded).
-- refund_note: admin note at approval / refund time.
-- refund_slip_path: private-bucket key of the proof-of-refund slip image.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_status"    TEXT        DEFAULT 'none';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_amount"     INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refunded_at"       TIMESTAMPTZ(6);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_note"       TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_slip_path"  TEXT;
