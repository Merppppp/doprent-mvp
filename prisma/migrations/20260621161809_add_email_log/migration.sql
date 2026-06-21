-- DropForeignKey
ALTER TABLE "banners" DROP CONSTRAINT "banners_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_product_id_fkey";

-- DropIndex
DROP INDEX "product_blackout_dates_product_id_date_key";

-- DropIndex
DROP INDEX "idx_products_description_trgm";

-- DropIndex
DROP INDEX "idx_products_designer_trgm";

-- DropIndex
DROP INDEX "idx_products_name_trgm";

-- DropIndex
DROP INDEX "products_search_idx";

-- DropIndex
DROP INDEX "idx_shops_name_trgm";

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shop_staff" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "email_logs_category_idx" ON "email_logs"("category");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "reviews_shop_status_created_idx" RENAME TO "reviews_shop_id_status_created_at_idx";
