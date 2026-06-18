import { NextRequest, NextResponse } from "next/server";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { amountDue } from "@/lib/bookings";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: { shop: true },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.renterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "waiting_for_payment") {
    return NextResponse.json({ error: "ยังไม่พร้อมชำระเงิน" }, { status: 400 });
  }
  if (!booking.shop.promptpayId) {
    return NextResponse.json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" }, { status: 400 });
  }

  // Use the canonical amountDue() from lib/bookings so the QR amount exactly
  // matches what the renter sees on the checkout page:
  //   rental_total + deposit + shipping_fee   (shipping was previously omitted → undercharge)
  const amount = amountDue({
    rental_total: Number(booking.rentalTotal),
    deposit: Number(booking.deposit),
    shipping_fee: booking.shippingFee !== null ? Number(booking.shippingFee) : null,
  });

  const payload = generatePayload(booking.shop.promptpayId, {
    amount,
  });
  const qrDataUrl = await QRCode.toDataURL(payload);

  return NextResponse.json({
    qr: qrDataUrl,
    amount,
    promptpayId: booking.shop.promptpayId,
  });
}
