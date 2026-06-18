import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createBooking } from "@/app/actions/bookings";

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
  const { addressId, startDate, endDate, variantId } = body;

  // Build FormData and delegate to server action, which enforces ALL policy checks:
  // availability, oversell prevention, variant validation, lead-time, status guards,
  // anti-spam, price-tier calculation, staff-account block, etc.
  const fd = new FormData();
  if (productId) fd.set("product_id", productId);
  // Preserve legacy alias so the server action back-compat path is also exercised.
  if (body.dressId) fd.set("dress_id", body.dressId);
  if (addressId) fd.set("address_id", addressId);
  if (startDate) fd.set("start_date", startDate);
  if (endDate) fd.set("end_date", endDate);
  if (variantId) fd.set("variant_id", variantId);

  const result = await createBooking(fd);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Load the full booking for a backward-compatible response shape.
  const booking = await db.booking.findUnique({
    where: { id: result.id },
    include: BOOKING_INCLUDE,
  });

  return NextResponse.json(booking, { status: 201 });
}
