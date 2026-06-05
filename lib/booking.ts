import { db } from "@/lib/db";

export async function expireStaleBookings(bookingIds: string[]) {
  if (bookingIds.length === 0) return;
  await db.booking.updateMany({
    where: {
      id: { in: bookingIds },
      status: "booking_pending",
      currentDueAt: { lt: new Date() },
    },
    data: { status: "cancelled" },
  });
}
