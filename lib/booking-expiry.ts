import { db } from "@/lib/db";

/**
 * Lazy payment-expiry sweep: flips every booking that is still
 * `waiting_for_payment` past its `currentDueAt` to `payment_expired`.
 *
 * Called opportunistically at the top of the booking list loaders
 * (/admin/bookings, /sell/bookings, /account/bookings) so users never see a
 * stale "waiting" booking, and exposed via POST /api/cron/expire-payments for
 * a real scheduler later. The updateMany WHERE clause makes it idempotent and
 * race-safe — concurrent sweeps simply match zero rows.
 *
 * Returns the number of bookings expired.
 */
export async function expireOverdueBookings(): Promise<number> {
  const res = await db.booking.updateMany({
    where: { status: "waiting_for_payment", currentDueAt: { lt: new Date() } },
    data: { status: "payment_expired" },
  });
  return res.count;
}
