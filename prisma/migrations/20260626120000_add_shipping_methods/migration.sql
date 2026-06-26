-- แยกวิธีจัดส่งเป็น 2 ขา: outbound (ร้าน→ลูกค้า) และ return (ลูกค้า→ร้าน)
-- ใช้คำนวณ buffer ก่อน/หลัง period การเช่า (express=0, standard=ค่า policy)
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "outbound_method" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "return_method" text;

-- back-fill จากคอลัมน์เดิม: delivery_method = ขา outbound
UPDATE "bookings" SET "outbound_method" = "delivery_method" WHERE "outbound_method" IS NULL;
UPDATE "bookings" SET "return_method" = "delivery_method" WHERE "return_method" IS NULL;
