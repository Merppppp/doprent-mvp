import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";

const BOOKING_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: { orderBy: { sortOrder: "asc" as const }, select: { url: true, alt: true, sortOrder: true } },
    },
  },
  shop: { select: { id: true, name: true, slug: true, lineUrl: true, promptpayId: true } },
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
      ? { shop: { ownerId: session.user.id } }
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
  // `dressId` accepted as a legacy alias during the rename deploy window.
  const productId = body.productId ?? body.dressId;
  const { addressId, startDate, endDate } = body;

  if (!productId || !startDate || !endDate) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const pendingCount = await db.booking.count({
    where: { renterId: session.user.id, status: "booking_pending" },
  });
  if (pendingCount >= 3) {
    return NextResponse.json({ error: "มี booking รอดำเนินการอยู่แล้ว 3 รายการ" }, { status: 400 });
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { shop: true },
  });
  if (!product) return NextResponse.json({ error: "ไม่พบชุดนี้" }, { status: 404 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const rentalTotal = product.pricePerDay * days;
  const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || "0.10");
  const commissionAmount = Math.round(rentalTotal * commissionRate);

  const addr = addressId
    ? await db.address.findUnique({ where: { id: addressId }, select: { recipientName: true, phone: true, addressLine: true } })
    : null;

  const booking = await withActor(session.user.id, () =>
    db.booking.create({
      data: {
        renterId: session.user.id,
        shopId: product.shopId,
        productId,
        startDate: start,
        endDate: end,
        rentalTotal,
        deposit: product.deposit,
        commissionRate,
        commissionAmount,
        addressId: addressId ?? null,
        recipientName: addr?.recipientName ?? null,
        phone: addr?.phone ?? null,
        addressText: addr?.addressLine ?? null,
      },
      include: BOOKING_INCLUDE,
    }),
  );

  return NextResponse.json(booking, { status: 201 });
}
