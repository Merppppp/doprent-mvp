import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?err=invalid_token`);
  }

  const record = await db.verificationToken.findUnique({ where: { token } });

  if (!record || record.expires < new Date()) {
    await db.verificationToken.deleteMany({ where: { token } });
    return NextResponse.redirect(`${baseUrl}/login?err=token_expired`);
  }

  await db.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });

  await db.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(`${baseUrl}/login?verified=1`);
}
