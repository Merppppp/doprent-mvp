-- เพิ่มสถานะ "ลูกค้าไม่ส่งคืนชุด" (terminal) ให้ enum booking_status
ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'not_returned';

-- เก็บสภาพชุดตอนรับคืน + รายละเอียดความเสียหาย
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "return_condition" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "return_damage_note" text;
