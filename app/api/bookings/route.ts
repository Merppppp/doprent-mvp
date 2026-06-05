import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const BOOKING_INCLUDE = {
  dress: { select: { id: true, name: true, slug: true, images: true } },
  boutique: { select: { id: true, name: true, slug: true, lineUrl: true, promptpayId: true } },
  address: true,
  renter: { select: { id: true, name: true, email: true } },
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
      : { renterId: session.user.id };

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
  const { dressId, addressId, startDate, endDate } = body;

  if (!dressId || !startDate || !endDate) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const pendingCount = await db.booking.count({
    where: { renterId: session.user.id, status: "booking_pending" },
  });
  if (pendingCount >= 3) {
    return NextResponse.json({ error: "มี booking รอดำเนินการอยู่แล้ว 3 รายการ" }, { status: 400 });
  }

  const dress = await db.dress.findUnique({
    where: { id: dressId },
    include: { boutique: true },
  });
  if (!dress) return NextResponse.json({ error: "ไม่พบชุดนี้" }, { status: 404 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const rentalTotal = dress.pricePerDay * days;
  const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || "0.10");
  const commissionAmount = Math.round(rentalTotal * commissionRate);

  const addr = addressId
    ? await db.address.findUnique({ where: { id: addressId }, select: { recipientName: true, phone: true, addressText: true } })
    : null;

  const booking = await db.booking.create({
    data: {
      renterId: session.user.id,
      boutiqueId: dress.boutiqueId,
      dressId,
      startDate: start,
      endDate: end,
      rentalTotal,
      deposit: dress.deposit,
      commissionRate,
      commissionAmount,
      addressId: addressId ?? null,
      recipientName: addr?.recipientName ?? null,
      phone: addr?.phone ?? null,
      addressText: addr?.addressText ?? null,
    },
    include: BOOKING_INCLUDE,
  });

  return NextResponse.json(booking, { status: 201 });
}
