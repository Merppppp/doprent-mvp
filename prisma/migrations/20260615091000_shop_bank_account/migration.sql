-- เพิ่มฟิลด์บัญชีธนาคารให้ร้าน (sellers รับเงินผ่าน bank transfer นอกเหนือจาก PromptPay)
-- Column-adds inherit existing shops table privileges — no privilege change needed.

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bank_account_number" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "bank_account_name" TEXT;
