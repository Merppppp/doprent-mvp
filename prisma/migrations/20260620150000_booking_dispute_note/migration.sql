-- Renter dispute note: counter-argument when shop flags slip as invalid
ALTER TABLE "bookings" ADD COLUMN "dispute_note" TEXT;
