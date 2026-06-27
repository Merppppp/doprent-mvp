-- Add 'lost' value to unit_status enum
ALTER TYPE "unit_status" ADD VALUE IF NOT EXISTS 'lost';

-- Add lost_from_booking_id column to product_units (tracks which order caused the loss)
ALTER TABLE "product_units" ADD COLUMN "lost_from_booking_id" UUID;

-- FK constraint: product_units.lost_from_booking_id -> bookings.id (SET NULL on delete)
ALTER TABLE "product_units"
  ADD CONSTRAINT "product_units_lost_from_booking_id_fkey"
  FOREIGN KEY ("lost_from_booking_id") REFERENCES "bookings"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for quick lookup of lost units by booking
CREATE INDEX "product_units_lost_from_booking_id_idx" ON "product_units"("lost_from_booking_id");
