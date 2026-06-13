-- Migration: tag_request
-- Adds the tag_requests table + tag_request_status enum for the
-- seller tag-request → admin approval workflow.
-- create-only — never run against uat/prod without granting:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON tag_requests TO <app_role>;

-- CreateEnum
CREATE TYPE "tag_request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "tag_requests" (
    "id"               UUID             NOT NULL,
    "tag_group_id"     UUID             NOT NULL,
    "shop_id"          UUID             NOT NULL,
    "requested_label"  TEXT             NOT NULL,
    "requested_key"    TEXT,
    "status"           "tag_request_status" NOT NULL DEFAULT 'pending',
    "reviewer_id"      UUID,
    "review_notes"     TEXT,
    "reviewed_at"      TIMESTAMPTZ(6),
    "created_tag_id"   UUID,
    "created_by"       UUID,
    "created_at"       TIMESTAMPTZ(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by"       UUID,
    "updated_at"       TIMESTAMPTZ(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey — tag_group_id
ALTER TABLE "tag_requests"
    ADD CONSTRAINT "tag_requests_tag_group_id_fkey"
    FOREIGN KEY ("tag_group_id") REFERENCES "tag_groups"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — shop_id
ALTER TABLE "tag_requests"
    ADD CONSTRAINT "tag_requests_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "tag_requests_status_idx"        ON "tag_requests"("status");
CREATE INDEX "tag_requests_tag_group_id_idx"  ON "tag_requests"("tag_group_id");
CREATE INDEX "tag_requests_shop_id_idx"       ON "tag_requests"("shop_id");

-- updated_at trigger (reuses set_updated_at() defined in the initial migration)
CREATE TRIGGER trg_tag_requests_updated_at
  BEFORE UPDATE ON "tag_requests"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── COMMENT ON TABLE / COLUMN ──────────────────────────────────────────────
COMMENT ON TABLE  "tag_requests"                    IS 'คำขอเพิ่มแท็กใหม่จากผู้ขาย — รอแอดมินอนุมัติสร้าง Tag จริงในระบบ';
COMMENT ON COLUMN "tag_requests"."id"               IS 'Primary key (uuid)';
COMMENT ON COLUMN "tag_requests"."tag_group_id"     IS 'FK → tag_groups.id กลุ่มแท็กที่ขอเพิ่ม (RESTRICT — ห้ามลบกลุ่มถ้ายังมีคำขอ)';
COMMENT ON COLUMN "tag_requests"."shop_id"          IS 'FK → shops.id ร้านที่ยื่นคำขอ (CASCADE — ลบร้านแล้วคำขอหาย)';
COMMENT ON COLUMN "tag_requests"."requested_label"  IS 'ชื่อแท็กที่ขอ (ภาษาไทย, บังคับ)';
COMMENT ON COLUMN "tag_requests"."requested_key"    IS 'slug แท็กที่เสนอ (ตัวเลือก — admin ยืนยันหรือกำหนดใหม่ตอนอนุมัติ)';
COMMENT ON COLUMN "tag_requests"."status"           IS 'สถานะการตรวจ: pending / approved / rejected';
COMMENT ON COLUMN "tag_requests"."reviewer_id"      IS 'uuid แอดมินผู้ตรวจ (ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "tag_requests"."review_notes"     IS 'บันทึกผลการตรวจ (เหตุผลตีกลับ หรือหมายเหตุ)';
COMMENT ON COLUMN "tag_requests"."reviewed_at"      IS 'เวลาที่แอดมินตัดสินใจ';
COMMENT ON COLUMN "tag_requests"."created_tag_id"   IS 'uuid ของ Tag ที่สร้างขึ้นเมื่ออนุมัติ (null = ยังไม่อนุมัติ; ไม่มี FK — ป้องกัน circular dependency)';
COMMENT ON COLUMN "tag_requests"."created_by"       IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "tag_requests"."created_at"       IS 'เวลาสร้าง record';
COMMENT ON COLUMN "tag_requests"."updated_by"       IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "tag_requests"."updated_at"       IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';
