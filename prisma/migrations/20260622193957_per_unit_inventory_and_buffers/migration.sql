-- CreateEnum
CREATE TYPE "unit_status" AS ENUM ('available', 'rented', 'repair', 'retired');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "overdue_reminder_sent_at" TIMESTAMPTZ(6),
ADD COLUMN     "return_reminder_sent_at" TIMESTAMPTZ(6),
ADD COLUMN     "unit_id" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "buffer_days_before" INTEGER;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "buffer_days_before" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "buffer_days_after" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "product_units" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" "unit_status" NOT NULL DEFAULT 'available',
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_units_variant_id_idx" ON "product_units"("variant_id");

-- CreateIndex
CREATE INDEX "product_units_status_idx" ON "product_units"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_units_variant_id_code_key" ON "product_units"("variant_id", "code");

-- CreateIndex
CREATE INDEX "bookings_unit_id_idx" ON "bookings"("unit_id");

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "product_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- DATA BACKFILL: serialize existing stock into physical units
-- ===========================================================================
-- gen_random_uuid() lives in pgcrypto (<PG13) / core (>=PG13); ensure available.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. For each variant create GREATEST(quantity,1) physical units, coded "<SIZE>-NNN".
INSERT INTO "product_units" ("id", "variant_id", "code", "status", "created_at", "updated_at")
SELECT gen_random_uuid(),
       v."id",
       v."size"::text || '-' || lpad(g.n::text, 3, '0'),
       'available',
       now(),
       now()
FROM "product_variants" v
CROSS JOIN LATERAL generate_series(1, GREATEST(v."quantity", 1)) AS g(n);

-- 2. Assign a distinct unit to every booking that currently holds stock
--    (waiting_for_payment | payment_review | confirmed | renting). Greedy by
--    start_date: pick the first unit of the variant with no overlapping holding
--    booking already assigned, so two overlapping bookings never share a unit.
--    Under the old invariant (concurrent active <= quantity) a free unit always
--    exists; if none (over-committed legacy data) the booking is left unassigned.
DO $$
DECLARE
  b      RECORD;
  chosen UUID;
BEGIN
  FOR b IN
    SELECT bk."id", bk."variant_id", bk."start_date", bk."end_date"
    FROM "bookings" bk
    WHERE bk."variant_id" IS NOT NULL
      AND bk."unit_id" IS NULL
      AND bk."status" IN ('waiting_for_payment', 'payment_review', 'confirmed', 'renting')
    ORDER BY bk."variant_id", bk."start_date"
  LOOP
    SELECT pu."id" INTO chosen
    FROM "product_units" pu
    WHERE pu."variant_id" = b."variant_id"
      AND NOT EXISTS (
        SELECT 1 FROM "bookings" ob
        WHERE ob."unit_id" = pu."id"
          AND ob."status" IN ('waiting_for_payment', 'payment_review', 'confirmed', 'renting')
          AND ob."start_date" <= b."end_date"
          AND ob."end_date"   >= b."start_date"
      )
    ORDER BY pu."code"
    LIMIT 1;

    IF chosen IS NOT NULL THEN
      UPDATE "bookings" SET "unit_id" = chosen WHERE "id" = b."id";
      -- mark unit as physically out when the booking is currently renting
      UPDATE "product_units"
        SET "status" = 'rented'
        WHERE "id" = chosen
          AND EXISTS (SELECT 1 FROM "bookings" rb WHERE rb."id" = b."id" AND rb."status" = 'renting');
    END IF;
  END LOOP;
END $$;
