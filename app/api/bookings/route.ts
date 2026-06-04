import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const BOOKING_INCLUDE = {
  dress: { select: { id: true, name: true, slug: true, images: true } },
  boutique: { select: { id: true, name: true, slug: true, lineUrl: true, promptpayId: true } },
  address: true,
  customer: { select: { id: true, name: true, email: true } },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") ?? "customer";

  const where =
    role === "seller"
      ? { boutique: { ownerId: session.user.id } }
      : { customerId: session.user.id };

  const bookings = await db.booking.findMany({
    where,
    include: BOOKING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { dressId, addressId, dateFrom, dateTo, note } = body;

  if (!dressId || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  // จำกัด 3 pending ต่อ user
  const pendingCount = await db.booking.count({
    where: { customerId: session.user.id, status: "pending" },
  });
  if (pendingCount >= 3) {
    return NextResponse.json({ error: "มี booking รอดำเนินการอยู่แล้ว 3 รายการ" }, { status: 400 });
  }

  const dress = await db.dress.findUnique({
    where: { id: dressId },
    include: { boutique: true },
  });
  if (!dress) return NextResponse.json({ error: "ไม่พบชุดนี้" }, { status: 404 });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const booking = await db.booking.create({
    data: {
      customerId: session.user.id,
      boutiqueId: dress.boutiqueId,
      dressId,
      addressId: addressId ?? null,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      rentalFee: dress.pricePerDay,
      depositFee: dress.deposit,
      shippingFee: 0,
      totalAmount: dress.pricePerDay + dress.deposit,
      note: note ?? null,
      expiresAt,
    },
    include: BOOKING_INCLUDE,
  });

  return NextResponse.json(booking, { status: 201 });
}
