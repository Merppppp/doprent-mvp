import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_EXPIRY_HOURS = 1;
const RESET_PREFIX = "reset:";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    // Only users with password credentials can reset (OAuth-only accounts skip).
    if (user?.passwordHash) {
      const identifier = `${RESET_PREFIX}${email}`;

      // Single active reset link per account: drop previous reset tokens.
      await db.verificationToken.deleteMany({ where: { identifier } });

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      await db.verificationToken.create({
        data: { identifier, token, expires },
      });

      await sendPasswordResetEmail(email, token);
    }
  } catch (e) {
    // Never leak failures (and never log the token) — same response either way.
    console.error("[doprent] forgot-password error", e);
  }

  // Always respond success to avoid account enumeration.
  return NextResponse.json({ ok: true });
}
