-- Migration: pg_trgm_search
-- เพิ่ม extension pg_trgm และ GIN index สำหรับค้นหาแบบ fuzzy/trigram บนตาราง products + shops
--
-- ⚠️ DEPLOY NOTE — superuser required on uat/prod:
--   CREATE EXTENSION ต้องการสิทธิ์ superuser (หรือ pg_extension_owner) ใน PostgreSQL มาตรฐาน
--   ใน dev (owner ของ DB) ทำได้โดยตรง
--   บน uat/prod ให้ DBA รัน: CREATE EXTENSION IF NOT EXISTS pg_trgm; ใน schema public ก่อน
--   จากนั้นจึง apply migration ส่วนที่เหลือ (CREATE INDEX) ได้โดย app user ปกติ
--
-- ⚠️ INDEX BUILD COST:
--   GIN index สร้างนานกว่า B-tree ขึ้นกับขนาดข้อมูล (ประมาณ 3–10× ขนาดตาราง)
--   แนะนำ apply ตอน traffic ต่ำ หรือใช้ CREATE INDEX CONCURRENTLY (ต้องรันนอก transaction)
--   หากใช้ CONCURRENTLY ให้รัน manual ใน psql แยกต่างหาก แทนการ migrate ผ่าน Prisma
--
-- ⚠️ GRANT:
--   migration นี้ไม่เพิ่ม column ใหม่ จึงไม่ต้องทำ GRANT เพิ่มเติม
--   app user ที่มีสิทธิ์ SELECT/INSERT/UPDATE/DELETE บน products + shops อยู่แล้ว
--   สามารถใช้ similarity() function ได้ทันทีหลัง extension ถูก enable

-- ---------------------------------------------------------------------------
-- 1. Extension pg_trgm
-- ---------------------------------------------------------------------------

-- เปิดใช้ pg_trgm extension: ให้ฟังก์ชัน similarity(), word_similarity(),
-- และ operator class gin_trgm_ops สำหรับ GIN index ค้นหาแบบ trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 2. GIN trigram indexes บนตาราง products
-- ---------------------------------------------------------------------------

-- index บน products.name — ชื่อสินค้า (column หลักที่ค้นหาบ่อยที่สุด)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

-- index บน products.designer — ชื่อดีไซเนอร์/แบรนด์ (nullable; index ใน PG ข้าม NULL อยู่แล้ว)
CREATE INDEX IF NOT EXISTS idx_products_designer_trgm
  ON products USING gin (designer gin_trgm_ops);

-- index บน products.description — คำอธิบายสินค้า (nullable; text ยาว — index ช่วยลด seq scan)
CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON products USING gin (description gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. GIN trigram index บนตาราง shops
-- ---------------------------------------------------------------------------

-- index บน shops.name — ชื่อร้าน (ใช้ใน search path ค้นหาสินค้าผ่านชื่อร้าน)
CREATE INDEX IF NOT EXISTS idx_shops_name_trgm
  ON shops USING gin (name gin_trgm_ops);
