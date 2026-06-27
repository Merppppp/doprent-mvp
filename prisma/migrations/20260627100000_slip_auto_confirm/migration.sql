-- AlterTable: add slip auto-confirm deadline and reminder guard
ALTER TABLE "bookings" ADD COLUMN "slip_confirm_due_at" TIMESTAMPTZ(6),
                       ADD COLUMN "slip_reminder_sent_at" TIMESTAMPTZ(6);
