-- DropForeignKey
ALTER TABLE "user_id_cards" DROP CONSTRAINT "user_id_cards_user_id_fkey";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "deduction_amount" INTEGER,
ADD COLUMN     "return_carrier" TEXT,
ADD COLUMN     "return_shipped_at" TIMESTAMPTZ(6),
ADD COLUMN     "return_tracking_number" TEXT,
ADD COLUMN     "return_tracking_url" TEXT;

-- AlterTable
ALTER TABLE "user_id_cards" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "user_id_cards" ADD CONSTRAINT "user_id_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
