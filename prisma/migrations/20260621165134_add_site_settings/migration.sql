-- DropIndex
DROP INDEX "product_blackout_dates_product_id_date_key";

-- DropIndex
DROP INDEX "idx_products_description_trgm";

-- DropIndex
DROP INDEX "idx_products_designer_trgm";

-- DropIndex
DROP INDEX "idx_products_name_trgm";

-- DropIndex
DROP INDEX "idx_shops_name_trgm";

-- DropIndex
DROP INDEX "idx_tags_key_trgm";

-- DropIndex
DROP INDEX "idx_tags_label_trgm";

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);
