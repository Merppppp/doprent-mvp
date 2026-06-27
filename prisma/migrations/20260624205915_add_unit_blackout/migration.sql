-- DropIndex
DROP INDEX "product_blackout_dates_product_id_variant_id_date_key";

-- AlterTable
ALTER TABLE "product_blackout_dates" ADD COLUMN     "unit_id" UUID;

-- CreateIndex
CREATE INDEX "product_blackout_dates_unit_id_idx" ON "product_blackout_dates"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_blackout_dates_product_id_variant_id_unit_id_date_key" ON "product_blackout_dates"("product_id", "variant_id", "unit_id", "date");

-- AddForeignKey
ALTER TABLE "product_blackout_dates" ADD CONSTRAINT "product_blackout_dates_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "product_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

