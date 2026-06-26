-- Drop the denormalized flat columns on `bookings`. The canonical product /
-- variant / unit references now live in `booking_items` (backfilled in P1).

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_product_id_fkey";
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_variant_id_fkey";
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_unit_id_fkey";

-- DropIndex
DROP INDEX "bookings_product_id_idx";
DROP INDEX "bookings_unit_id_idx";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "product_id",
DROP COLUMN "variant_id",
DROP COLUMN "unit_id";
