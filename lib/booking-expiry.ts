import { db } from "@/lib/db";

/**
 * Lazy payment-expiry sweep: flips every booking that is still
 * `waiting_for_payment` past its `currentDueAt` to `payment_expired`.
 *
 * Also auto-transitions `confirmed` → `renting` when `start_date` has arrived
 * (only for paid bookings — status must be `confirmed`).
 *
 * Called opportunistically at the top of the booking list loaders
 * (/admin/bookings, /sell/bookings, /account/bookings) so users never see a
 * stale booking, and exposed via POST /api/cron/expire-payments for a real
 * scheduler later. The updateMany WHERE clause makes it idempotent and
 * race-safe — concurrent sweeps simply match zero rows.
 *
 * Returns the number of bookings affected.
 */
export async function expireOverdueBookings(): Promise<number> {
  const now = new Date();
  const todayStart = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  todayStart.setHours(0, 0, 0, 0);

  const [expired, startedRenting] = await Promise.all([
    db.booking.updateMany({
      where: { status: "waiting_for_payment", currentDueAt: { lt: now } },
      data: { status: "payment_expired", cancelledBy: "system" },
    }),
    db.booking.updateMany({
      where: { status: "confirmed", startDate: { lte: todayStart } },
      data: { status: "renting" },
    }),
  ]);

  return expired.count + startedRenting.count;
}
