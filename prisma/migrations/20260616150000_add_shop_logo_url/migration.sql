-- Shop logo image (PUBLIC bucket URL). Additive nullable column —
-- inherits existing table GRANTs, no role change needed.
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
