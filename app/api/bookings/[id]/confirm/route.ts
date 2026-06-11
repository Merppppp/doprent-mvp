import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: { boutique: true },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.boutique.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "payment_review") {
    return NextResponse.json({ error: "ยังไม่มีสลิปการชำระเงิน" }, { status: 400 });
  }

  const updated = await db.booking.update({
    where: { id: params.id },
    data: { status: "confirmed" },
  });

  return NextResponse.json(updated);
}
