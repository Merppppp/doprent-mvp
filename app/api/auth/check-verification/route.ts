import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Used by login page to distinguish "wrong password" from "email not verified"
// after a CredentialsSignin error, without exposing whether an account exists.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ needsVerification: false });

  const user = await db.user.findUnique({
    where: { email },
    select: { emailVerified: true, passwordHash: true },
  });

  const needsVerification = Boolean(user?.passwordHash && !user.emailVerified);
  return NextResponse.json({ needsVerification });
}
