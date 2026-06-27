-- AlterEnum
ALTER TYPE "booking_status" ADD VALUE 'deposit_disputed';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "bank_account_id" UUID,
ADD COLUMN     "deposit_decision" TEXT,
ADD COLUMN     "deposit_dispute_note" TEXT,
ADD COLUMN     "next_available_date" DATE,
ADD COLUMN     "refund_account_name" TEXT,
ADD COLUMN     "refund_account_number" TEXT,
ADD COLUMN     "refund_bank_name" TEXT,
ADD COLUMN     "refund_slip_due_at" TIMESTAMPTZ(6),
ADD COLUMN     "refund_verified_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'บัญชีหลัก',
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
