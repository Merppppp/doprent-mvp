-- บันทึกความยินยอมนโยบายความเป็นส่วนตัว (PDPA evidence) ในตาราง users
-- Column-adds inherit existing users table privileges — no privilege change needed.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMPTZ(6);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_version" TEXT;
