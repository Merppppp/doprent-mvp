-- Migration: banner
-- Adds the banners table for admin-managed homepage carousel content.

-- CreateTable banners
CREATE TABLE "banners" (
    "id"          UUID          NOT NULL,
    "title"       TEXT          NOT NULL,
    "image_url"   TEXT          NOT NULL,
    "link_url"    TEXT,
    "sort_order"  INTEGER       NOT NULL DEFAULT 0,
    "is_active"   BOOLEAN       NOT NULL DEFAULT true,
    "starts_at"   TIMESTAMPTZ(6),
    "ends_at"     TIMESTAMPTZ(6),
    "created_by"  UUID,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by"  UUID,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_is_active_sort_order_idx" ON "banners"("is_active", "sort_order");

-- updated_at trigger for banners (reuses set_updated_at() defined in the initial migration)
CREATE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON "banners"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── COMMENT ON TABLE/COLUMN ──
COMMENT ON TABLE "banners" IS 'แบนเนอร์โฆษณา/โปรโมชั่นสำหรับ carousel หน้าหลัก (จัดการโดย admin)';
COMMENT ON COLUMN "banners"."id"          IS 'Primary key (uuid)';
COMMENT ON COLUMN "banners"."title"       IS 'ชื่อแบนเนอร์ที่แสดงใน carousel';
COMMENT ON COLUMN "banners"."image_url"   IS 'URL รูปภาพแบนเนอร์';
COMMENT ON COLUMN "banners"."link_url"    IS 'URL ปลายทางเมื่อผู้ใช้คลิกแบนเนอร์ (null = ไม่มี link)';
COMMENT ON COLUMN "banners"."sort_order"  IS 'ลำดับการแสดงผลใน carousel (น้อย = แสดงก่อน)';
COMMENT ON COLUMN "banners"."is_active"   IS 'เปิดใช้งานแบนเนอร์ (false = ซ่อน)';
COMMENT ON COLUMN "banners"."starts_at"   IS 'เวลาเริ่มแสดงแบนเนอร์ (null = ไม่กำหนด)';
COMMENT ON COLUMN "banners"."ends_at"     IS 'เวลาสิ้นสุดการแสดงแบนเนอร์ (null = ไม่กำหนด)';
COMMENT ON COLUMN "banners"."created_by"  IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "banners"."created_at"  IS 'เวลาสร้าง record';
COMMENT ON COLUMN "banners"."updated_by"  IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "banners"."updated_at"  IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';
