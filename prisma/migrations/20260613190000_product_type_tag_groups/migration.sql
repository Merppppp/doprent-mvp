-- Migration: product_type_tag_groups
-- Binds tag groups to product types so the seller product form renders one
-- multi/single-select section per bound group (occasion becomes the first row).
-- create-only — never run against uat/prod without granting:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON product_type_tag_groups TO <app_role>;

-- CreateEnum
CREATE TYPE "tag_selection_mode" AS ENUM ('single', 'multi');

-- CreateTable
CREATE TABLE "product_type_tag_groups" (
    "id"               UUID NOT NULL,
    "product_type_id"  UUID NOT NULL,
    "tag_group_id"     UUID NOT NULL,
    "sort_order"       INTEGER NOT NULL DEFAULT 0,
    "is_required"      BOOLEAN NOT NULL DEFAULT false,
    "selection_mode"   "tag_selection_mode" NOT NULL DEFAULT 'multi',
    "is_active"        BOOLEAN NOT NULL DEFAULT true,
    "created_by"       UUID,
    "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by"       UUID,
    "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_type_tag_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey — product_type_id (RESTRICT)
ALTER TABLE "product_type_tag_groups"
    ADD CONSTRAINT "product_type_tag_groups_product_type_id_fkey"
    FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey — tag_group_id (RESTRICT)
ALTER TABLE "product_type_tag_groups"
    ADD CONSTRAINT "product_type_tag_groups_tag_group_id_fkey"
    FOREIGN KEY ("tag_group_id") REFERENCES "tag_groups"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "product_type_tag_groups_product_type_id_tag_group_id_key"
    ON "product_type_tag_groups"("product_type_id", "tag_group_id");
CREATE INDEX "product_type_tag_groups_product_type_id_idx"
    ON "product_type_tag_groups"("product_type_id");
CREATE INDEX "product_type_tag_groups_tag_group_id_idx"
    ON "product_type_tag_groups"("tag_group_id");

-- updated_at trigger (reuses set_updated_at() from the initial migration)
CREATE TRIGGER trg_product_type_tag_groups_updated_at
  BEFORE UPDATE ON "product_type_tag_groups"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Data seed: convert the hardcoded "occasion" into a binding row ──
INSERT INTO "product_type_tag_groups"
  ("id","product_type_id","tag_group_id","sort_order","is_required","selection_mode","is_active","created_at","updated_at")
SELECT gen_random_uuid(), pt.id, tg.id, 0, false, 'multi', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "product_types" pt
CROSS JOIN "tag_groups" tg
WHERE tg."key" = 'occasion'
  AND pt."key" = 'dress'
ON CONFLICT ("product_type_id","tag_group_id") DO NOTHING;

-- ── COMMENT ON TABLE / COLUMN ──
COMMENT ON TABLE  "product_type_tag_groups"                   IS 'ผูกกลุ่มแท็ก ↔ ประเภทสินค้า — กำหนดช่องเลือกแท็กที่แบบฟอร์มสินค้าต้องเรนเดอร์ (occasion = instance แรก)';
COMMENT ON COLUMN "product_type_tag_groups"."product_type_id" IS 'FK → product_types.id ประเภทสินค้าที่ผูก (RESTRICT)';
COMMENT ON COLUMN "product_type_tag_groups"."tag_group_id"    IS 'FK → tag_groups.id กลุ่มแท็กที่ผูก (RESTRICT)';
COMMENT ON COLUMN "product_type_tag_groups"."sort_order"      IS 'ลำดับการแสดง section ของกลุ่มในแบบฟอร์มสินค้าของประเภทนี้';
COMMENT ON COLUMN "product_type_tag_groups"."is_required"     IS 'บังคับเลือกอย่างน้อย 1 แท็กของกลุ่มนี้หรือไม่';
COMMENT ON COLUMN "product_type_tag_groups"."selection_mode"  IS 'โหมดการเลือก: single / multi';
COMMENT ON COLUMN "product_type_tag_groups"."is_active"       IS 'ปิดการใช้งาน binding โดยไม่ต้องลบ';
COMMENT ON COLUMN "product_type_tag_groups"."created_by"      IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK)';
COMMENT ON COLUMN "product_type_tag_groups"."created_at"      IS 'เวลาสร้าง record';
COMMENT ON COLUMN "product_type_tag_groups"."updated_by"      IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "product_type_tag_groups"."updated_at"      IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';
