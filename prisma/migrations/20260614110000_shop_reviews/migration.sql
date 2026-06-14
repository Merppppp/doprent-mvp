-- Migration: shop_reviews
-- Adds the reviews table + review_status enum, plus rating rollup columns on shops.
-- create-only — apply MANUALLY (Woodpecker does not run prisma migrate)
-- NOTE: on uat/prod the DBA must give the *_app role SELECT/INSERT/UPDATE/DELETE
--       privileges on reviews afterward:
--         GRANT SELECT, INSERT, UPDATE, DELETE ON reviews TO <app_role>;
--       shops column-adds inherit existing grants (no extra step needed).
--       dev owner=app so none needed in local dev.

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('visible', 'hidden');

-- CreateTable
CREATE TABLE "reviews" (
    "id"                UUID             NOT NULL,
    "reviewer_id"       UUID,
    "shop_id"           UUID             NOT NULL,
    "booking_id"        UUID,
    "rating"            INTEGER          NOT NULL,
    "comment"           TEXT,
    "status"            "review_status"  NOT NULL DEFAULT 'visible',
    "seller_reply"      TEXT,
    "seller_replied_at" TIMESTAMPTZ(6),
    "created_by"        UUID,
    "created_at"        TIMESTAMPTZ(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by"        UUID,
    "updated_at"        TIMESTAMPTZ(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey"             PRIMARY KEY ("id"),
    CONSTRAINT "reviews_rating_check"     CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT "reviews_comment_len_check" CHECK (comment IS NULL OR char_length(comment) <= 1000)
);

-- AddForeignKey — reviewer_id → users
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey"
    FOREIGN KEY ("reviewer_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey — shop_id → shops
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey — booking_id → bookings
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_shop_id_idx"         ON "reviews"("shop_id");
CREATE INDEX "reviews_reviewer_id_idx"     ON "reviews"("reviewer_id");
CREATE INDEX "reviews_shop_status_created_idx" ON "reviews"("shop_id", "status", "created_at" DESC);

-- updated_at trigger (reuses set_updated_at() defined in the initial migration)
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON "reviews"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- AddColumn — shops.rating_avg + shops.rating_count
ALTER TABLE "shops" ADD COLUMN "rating_avg"   DECIMAL(3,2);
ALTER TABLE "shops" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

-- ── COMMENT ON TABLE / COLUMN ──────────────────────────────────────────────
COMMENT ON TABLE  "reviews"                       IS 'รีวิวร้านจากผู้เช่า — 1 การจอง รีวิวได้ 1 ครั้ง; admin ซ่อนได้; ร้านตอบกลับได้ 1 ครั้ง';
COMMENT ON COLUMN "reviews"."id"                  IS 'Primary key (uuid)';
COMMENT ON COLUMN "reviews"."reviewer_id"         IS 'FK → users.id ผู้เขียนรีวิว (SetNull — ลบผู้ใช้แล้วรีวิวยังอยู่)';
COMMENT ON COLUMN "reviews"."shop_id"             IS 'FK → shops.id ร้านที่รีวิว (Cascade — ลบร้านแล้วรีวิวหาย)';
COMMENT ON COLUMN "reviews"."booking_id"          IS 'FK → bookings.id การจองที่รีวิว (SetNull — ลบ booking แล้วรีวิวยังอยู่)';
COMMENT ON COLUMN "reviews"."rating"              IS 'คะแนน 1–5 ดาว (CHECK 1..5)';
COMMENT ON COLUMN "reviews"."comment"             IS 'ความเห็น (ไม่บังคับ ≤ 1000 ตัวอักษร)';
COMMENT ON COLUMN "reviews"."status"              IS 'สถานะการแสดงผล: visible = แสดง, hidden = admin ซ่อน';
COMMENT ON COLUMN "reviews"."seller_reply"        IS 'ข้อความตอบกลับของร้าน (ไม่บังคับ; เขียนทับได้)';
COMMENT ON COLUMN "reviews"."seller_replied_at"   IS 'เวลาที่ร้านตอบกลับครั้งล่าสุด';
COMMENT ON COLUMN "reviews"."created_by"          IS 'uuid ผู้สร้าง record (NULL = system/seed)';
COMMENT ON COLUMN "reviews"."created_at"          IS 'เวลาสร้าง record';
COMMENT ON COLUMN "reviews"."updated_by"          IS 'uuid ผู้แก้ไขล่าสุด';
COMMENT ON COLUMN "reviews"."updated_at"          IS 'เวลาแก้ไขล่าสุด (DB trigger + Prisma @updatedAt)';
COMMENT ON COLUMN "shops"."rating_avg"            IS 'คะแนนเฉลี่ยรีวิวทั้งหมดของร้าน (NULL = ยังไม่มีรีวิว) — อัปเดตโดย recomputeShopRating()';
COMMENT ON COLUMN "shops"."rating_count"          IS 'จำนวนรีวิวที่มองเห็น (status=visible) ของร้าน — อัปเดตโดย recomputeShopRating()';
