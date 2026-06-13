-- Migration: shop_banner
-- Extends banners table to support seller-created shop promo banners.
-- Two new columns:
--   shop_id UUID NULL FK→shops(id) ON DELETE CASCADE
--     NULL = admin/global homepage banner (existing behaviour unchanged)
--     non-NULL = seller shop promo banner (requires adsTier >= boost)
--   status TEXT NOT NULL DEFAULT 'approved'
--     'approved' = visible in carousel (existing admin banners keep this default)
--     'pending'  = awaiting admin review (seller-created banners start here)
--     'rejected' = rejected by admin
--
-- DEPLOY NOTE: Column additions to an existing table. In PostgreSQL, newly added
-- columns inherit the table-level privileges already GRANTed to the app role.
-- No new GRANT statement is needed — column adds are non-breaking DDL.
-- The app role already has SELECT/INSERT/UPDATE/DELETE on "banners" from the
-- previous migration. Zero downtime: NULLable column + column with DEFAULT.

ALTER TABLE "banners"
  ADD COLUMN "shop_id" UUID NULL,
  ADD COLUMN "status"  TEXT NOT NULL DEFAULT 'approved'
    CONSTRAINT "banners_status_check"
      CHECK ("status" IN ('pending', 'approved', 'rejected'));

ALTER TABLE "banners"
  ADD CONSTRAINT "banners_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;

CREATE INDEX "banners_shop_id_idx" ON "banners"("shop_id");

-- COMMENT ON
COMMENT ON COLUMN "banners"."shop_id"
  IS 'FK → shops.id ร้านเจ้าของแบนเนอร์ (NULL = แบนเนอร์ระดับ admin/global; non-NULL = แบนเนอร์โปรโมชั่นร้านของ seller)';
COMMENT ON COLUMN "banners"."status"
  IS 'สถานะการอนุมัติ: pending (รออนุมัติ) | approved (อนุมัติแล้ว แสดงใน carousel) | rejected (ปฏิเสธ); แบนเนอร์ admin ค่าเริ่มต้น approved; แบนเนอร์ seller เริ่มต้น pending';
