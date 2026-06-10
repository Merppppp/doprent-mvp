import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { r2, R2_PRIVATE_BUCKET } from "@/lib/r2";

export const dynamic = "force-dynamic";

const EXPIRES_IN = 60 * 15; // 15 นาที

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: { boutique: true },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!booking.slipPath) return NextResponse.json({ error: "ยังไม่มีสลิป" }, { status: 404 });

  const isSeller = booking.boutique.ownerId === session.user.id;
  const isAdmin = session.user.role === "admin";

  if (!isSeller && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: booking.slipPath }),
    { expiresIn: EXPIRES_IN }
  );

  return NextResponse.json({ url: signedUrl, expiresIn: EXPIRES_IN });
}
