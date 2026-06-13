-- Migration: booking_policy
-- Adds per-shop booking policy columns, ShopClosedDate table,
-- and per-product policy override columns.

-- AlterTable shops: add policy columns
ALTER TABLE "shops"
  ADD COLUMN "lead_time_days"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "min_rental_days"    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "max_rental_days"    INTEGER,
  ADD COLUMN "return_window_days" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "buffer_days_after"  INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "closed_weekdays"    INTEGER[] NOT NULL DEFAULT '{}';

-- CreateTable shop_closed_dates
CREATE TABLE "shop_closed_dates" (
    "id"         UUID NOT NULL,
    "shop_id"    UUID NOT NULL,
    "date"       DATE NOT NULL,
    "note"       TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_closed_dates_pkey" PRIMARY KEY ("id")
);

-- AlterTable products: add policy override columns
ALTER TABLE "products"
  ADD COLUMN "policy_override"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lead_time_days"     INTEGER,
  ADD COLUMN "min_rental_days"    INTEGER,
  ADD COLUMN "max_rental_days"    INTEGER,
  ADD COLUMN "return_window_days" INTEGER,
  ADD COLUMN "buffer_days_after"  INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "shop_closed_dates_shop_id_date_key" ON "shop_closed_dates"("shop_id", "date");
CREATE INDEX "shop_closed_dates_shop_id_idx" ON "shop_closed_dates"("shop_id");
CREATE INDEX "shop_closed_dates_date_idx" ON "shop_closed_dates"("date");

-- AddForeignKey
ALTER TABLE "shop_closed_dates" ADD CONSTRAINT "shop_closed_dates_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- updated_at trigger for shop_closed_dates
CREATE TRIGGER trg_shop_closed_dates_updated_at
  BEFORE UPDATE ON "shop_closed_dates"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── COMMENT ON TABLE/COLUMN (new columns/table from booking_policy migration) ──
COMMENT ON COLUMN "shops"."lead_time_days" IS 'จำนวนวันล่วงหน้าขั้นต่ำที่ผู้เช่าต้องจอง (วันรับ >= วันนี้ + leadTimeDays)';
COMMENT ON COLUMN "shops"."min_rental_days" IS 'จำนวนวันเช่าขั้นต่ำต่อครั้ง';
COMMENT ON COLUMN "shops"."max_rental_days" IS 'จำนวนวันเช่าสูงสุดต่อครั้ง (null = ไม่จำกัด)';
COMMENT ON COLUMN "shops"."return_window_days" IS 'จำนวนวันที่ผู้เช่าต้องคืนสินค้าหลังวันสิ้นสุดการเช่า (แสดงต่อผู้เช่า)';
COMMENT ON COLUMN "shops"."buffer_days_after" IS 'จำนวนวันบัฟเฟอร์หลังการเช่าแต่ละครั้ง (ช่วงเตรียม/ทำความสะอาด — บล็อกช่วง [start, end+bufferDaysAfter])';
COMMENT ON COLUMN "shops"."closed_weekdays" IS 'วันปิดทำการประจำสัปดาห์ (0=อาทิตย์..6=เสาร์) — ซ้ำทุกสัปดาห์';

COMMENT ON TABLE "shop_closed_dates" IS 'วันหยุดพิเศษ/วันปิดร้านแบบระบุวัน (one-off holidays) — mirror ของ product_blackout_dates แต่ระดับร้าน';
COMMENT ON COLUMN "shop_closed_dates"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "shop_closed_dates"."shop_id" IS 'FK → shops.id (Cascade)';
COMMENT ON COLUMN "shop_closed_dates"."date" IS 'วันที่ปิดร้าน';
COMMENT ON COLUMN "shop_closed_dates"."note" IS 'หมายเหตุ (เช่น "วันสงกรานต์")';
COMMENT ON COLUMN "shop_closed_dates"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "shop_closed_dates"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "shop_closed_dates"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "shop_closed_dates"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON COLUMN "products"."policy_override" IS 'เมื่อ true ใช้ policy ของสินค้านี้เองแทน policy ของร้าน';
COMMENT ON COLUMN "products"."lead_time_days" IS 'override: จำนวนวันล่วงหน้าขั้นต่ำ (ใช้เมื่อ policyOverride = true; null = ใช้ค่าของร้าน)';
COMMENT ON COLUMN "products"."min_rental_days" IS 'override: จำนวนวันเช่าขั้นต่ำ (ใช้เมื่อ policyOverride = true; null = ใช้ค่าของร้าน)';
COMMENT ON COLUMN "products"."max_rental_days" IS 'override: จำนวนวันเช่าสูงสุด (null + override = ไม่จำกัด; null + ไม่ override = ใช้ค่าของร้าน)';
COMMENT ON COLUMN "products"."return_window_days" IS 'override: จำนวนวันคืนสินค้า (ใช้เมื่อ policyOverride = true; null = ใช้ค่าของร้าน)';
COMMENT ON COLUMN "products"."buffer_days_after" IS 'override: จำนวนวันบัฟเฟอร์หลังเช่า (ใช้เมื่อ policyOverride = true; null = ใช้ค่าของร้าน)';
