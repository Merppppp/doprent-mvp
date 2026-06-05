import { NextRequest, NextResponse } from "next/server";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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
  if (booking.customerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "waiting_payment") {
    return NextResponse.json({ error: "ยังไม่พร้อมชำระเงิน" }, { status: 400 });
  }
  if (!booking.boutique.promptpayId) {
    return NextResponse.json({ error: "ร้านนี้ยังไม่ได้ตั้งค่า PromptPay" }, { status: 400 });
  }

  const payload = generatePayload(booking.boutique.promptpayId, {
    amount: booking.totalAmount,
  });
  const qrDataUrl = await QRCode.toDataURL(payload);

  return NextResponse.json({
    qr: qrDataUrl,
    amount: booking.totalAmount,
    promptpayId: booking.boutique.promptpayId,
  });
}
