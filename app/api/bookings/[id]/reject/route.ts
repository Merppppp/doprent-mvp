import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rejectBooking } from "@/app/actions/bookings";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delegate to server action — it enforces ownership, status-transition validity
  // (findTransition: booking_pending → rejected, actor: seller), and atomic
  // updateMany guard to prevent races.
  const result = await rejectBooking(params.id);
  if (!result.ok) {
    const status = result.error.includes("ไม่มีสิทธิ์")
      ? 403
      : result.error.includes("ไม่พบ")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const updated = await db.booking.findUnique({ where: { id: params.id } });
  return NextResponse.json(updated);
}
