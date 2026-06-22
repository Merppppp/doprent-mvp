import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ error: "รหัสผ่านใหม่ต้องอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้" }, { status: 404 });
  }

  if (user.passwordHash) {
    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json({ error: "กรุณากรอกรหัสผ่านปัจจุบัน" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
