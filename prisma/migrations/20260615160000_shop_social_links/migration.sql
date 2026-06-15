-- Add optional social media handles/URLs to shops (Facebook, X/Twitter, TikTok).
-- Nullable columns — safe additive change, no backfill required.
ALTER TABLE "shops" ADD COLUMN "facebook" TEXT;
ALTER TABLE "shops" ADD COLUMN "twitter" TEXT;
ALTER TABLE "shops" ADD COLUMN "tiktok" TEXT;
