import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const RESET_PREFIX = "reset:";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "ลิงก์ไม่ถูกต้อง" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร" },
      { status: 400 },
    );
  }

  const record = await db.verificationToken.findUnique({ where: { token } });

  if (
    !record ||
    !record.identifier.startsWith(RESET_PREFIX) ||
    record.expires < new Date()
  ) {
    // Clean up expired/invalid token if it exists.
    await db.verificationToken.deleteMany({ where: { token } });
    return NextResponse.json(
      { error: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่" },
      { status: 400 },
    );
  }

  const email = record.identifier.slice(RESET_PREFIX.length);
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    // Single-use: consume the token and update the password atomically.
    await db.$transaction([
      db.verificationToken.delete({ where: { token } }),
      db.user.update({ where: { email }, data: { passwordHash } }),
    ]);
  } catch (e) {
    console.error("[doprent] reset-password error", e);
    return NextResponse.json(
      { error: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
