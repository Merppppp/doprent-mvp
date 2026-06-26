-- Change default buffer days from 1/0 to 2/2 (parcel transit only, not cleaning)

-- Update schema defaults
ALTER TABLE "shops" ALTER COLUMN "buffer_days_after" SET DEFAULT 2;
ALTER TABLE "shops" ALTER COLUMN "buffer_days_before" SET DEFAULT 2;

-- Backfill all existing shops to 2/2
UPDATE "shops" SET "buffer_days_before" = 2 WHERE "buffer_days_before" < 2;
UPDATE "shops" SET "buffer_days_after" = 2 WHERE "buffer_days_after" < 2;
