import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const shippingFee = Number(body.shippingFee ?? 0);

  if (isNaN(shippingFee) || shippingFee < 0) {
    return NextResponse.json({ error: "ค่าส่งไม่ถูกต้อง" }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: { boutique: true },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.boutique.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "booking_pending") {
    return NextResponse.json({ error: "ไม่สามารถตอบรับได้ในสถานะนี้" }, { status: 400 });
  }

  const updated = await db.booking.update({
    where: { id: params.id },
    data: {
      status: "waiting_for_payment",
      shippingFee,
    },
  });

  return NextResponse.json(updated);
}
