-- Migration: booking_completion
-- Adds two terminal BookingStatus values: returned + completed.
-- These represent the positive end-of-life path for a rental:
--   confirmed → returned → completed
-- Availability is released once a booking leaves confirmed (enters returned),
-- because returned and completed are NOT in ACTIVE_STATUSES in lib/bookings.ts.

-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
-- PostgreSQL versions < 12.  Prisma wraps migrations in a transaction by default.
-- If your Postgres version is < 12, apply this migration manually outside a
-- transaction (psql without BEGIN/COMMIT wrappers).
-- PG 12+ allows ADD VALUE inside transactions — this is safe on modern installs.

ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'completed';

-- COMMENT ON for the two new enum values (mirrors the convention in
-- scripts/gen-comments.ts for enum labels)
COMMENT ON TYPE "booking_status" IS 'state machine การจอง — booking_pending, waiting_for_payment, payment_review, confirmed, cancel_requested, slip_disputed, rejected, cancelled, payment_expired, returned, completed';

-- No new table columns are added in this migration.
-- returned_at / completed_at timestamps are derivable from the audit log
-- (bookings.updated_at snapshots the last transition time) — YAGNI for v0.1.
