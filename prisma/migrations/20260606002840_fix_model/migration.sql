/*
  Warnings:

  - You are about to drop the column `address_text` on the `addresses` table. All the data in the column will be lost.
  - Added the required column `address_line` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postal_code` to the `addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "address_text",
ADD COLUMN     "address_line" TEXT NOT NULL,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "postal_code" TEXT NOT NULL,
ADD COLUMN     "province" TEXT DEFAULT 'กรุงเทพมหานคร',
ADD COLUMN     "subdistrict" TEXT;
