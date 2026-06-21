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
      select: { id: true, passwordHash: true, accounts: { select: { provider: true } } },
    });

    if (user && !user.passwordHash) {
      const providers = user.accounts.map((a) => a.provider);
      return NextResponse.json({ ok: true, oauth: true, providers });
    }

    if (user?.passwordHash) {
      const identifier = `${RESET_PREFIX}${email}`;
      await db.verificationToken.deleteMany({ where: { identifier } });

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      await db.verificationToken.create({
        data: { identifier, token, expires },
      });

      await sendPasswordResetEmail(email, token);
    }
  } catch (e) {
    console.error("[doprent] forgot-password error", e);
  }

  return NextResponse.json({ ok: true });
}
