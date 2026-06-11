import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { r2, R2_PRIVATE_BUCKET } from "@/lib/r2";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB — slip อาจเป็น screenshot ใหญ่กว่ารูปชุด
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // อ่าน formData ก่อน DB query เพื่อหลีกเลี่ยง Next.js body parsing issue
  const formData = await req.formData();
  const file = formData.get("file");

  const booking = await db.booking.findUnique({ where: { id: params.id } });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.renterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "waiting_for_payment") {
    return NextResponse.json({ error: "ไม่สามารถอัปโหลดสลิปในสถานะนี้" }, { status: 400 });
  }

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "กรุณาแนบไฟล์สลิป" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะ jpg, png, webp" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5MB" }, { status: 400 });
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const key = `slips/${params.id}_${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  const updated = await db.booking.update({
    where: { id: params.id },
    data: { status: "payment_review", slipPath: key },
  });

  return NextResponse.json(updated);
}
