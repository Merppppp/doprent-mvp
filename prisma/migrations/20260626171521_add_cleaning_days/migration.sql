-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cleaning_days" INTEGER;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "cleaning_days" INTEGER NOT NULL DEFAULT 1;
