import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_EXPIRY_HOURS = 24;

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "missing email" }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });

  // Always return ok to avoid email enumeration
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

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
