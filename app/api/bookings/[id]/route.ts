import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { expireStaleBookings } from "@/lib/booking";

const BOOKING_INCLUDE = {
  dress: { select: { id: true, name: true, slug: true, images: true } },
  boutique: { select: { id: true, name: true, slug: true, lineUrl: true, promptpayId: true } },
  address: true,
  customer: { select: { id: true, name: true, email: true } },
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: BOOKING_INCLUDE,
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await expireStaleBookings([booking.id]);

  const isCustomer = booking.customerId === session.user.id;
  const isSeller = booking.boutique.id === (await db.boutique.findFirst({ where: { ownerId: session.user.id } }))?.id;
  const isAdmin = session.user.role === "admin";

  if (!isCustomer && !isSeller && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(booking);
}
