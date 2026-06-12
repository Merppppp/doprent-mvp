import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: { shop: true },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.shop.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "payment_review") {
    return NextResponse.json({ error: "ยังไม่มีสลิปการชำระเงิน" }, { status: 400 });
  }

  const updated = await withActor(session.user.id, () =>
    db.booking.update({
      where: { id: params.id },
      data: { status: "confirmed" },
    }),
  );

  return NextResponse.json(updated);
}
