import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { TERMS_VERSION } from "@/lib/consent";

/**
 * Returns the admin email whitelist.
 * Reads from ADMIN_EMAILS env var (comma-separated, trimmed, lowercased).
 * Falls back to the original three addresses when the var is unset so that
 * environments without the new variable keep working unchanged.
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const TOKEN_EXPIRY_HOURS = 24;

export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Don't reveal whether email exists — treat as "check your email"
    return NextResponse.json({ ok: true });
  }

  const role = getAdminEmails().includes(email.toLowerCase()) ? "admin" : "customer";
  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { email, passwordHash, fullName, role, termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
  });

  // Create verification token (expires in 24h)
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.verificationToken.upsert({
    where: { token },
    update: { expires },
    create: { identifier: email, token, expires },
  });

  await sendVerificationEmail(email, token);

  return NextResponse.json({ ok: true });
}
