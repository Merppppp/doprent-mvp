import { db } from "@/lib/db";
import { AUTO_COMPLETE_AFTER_RETURN_DAYS } from "@/lib/bookings";
import { notifyReturnDue, notifyReturnOverdue } from "@/lib/notifications";

/**
 * Lazy payment-expiry sweep: flips every booking that is still
 * `waiting_for_payment` past its `currentDueAt` to `payment_expired`.
 *
 * Also auto-transitions `confirmed` → `renting` when `start_date` has arrived
 * (only for paid bookings — status must be `confirmed`), and
 * `renting` → `awaiting_return` at 00:00 of the rental's last day (`end_date`),
 * so the seller sees a "รอคืนของ" prompt. The dress unit stays `rented`
 * (awaiting_return still blocks stock) until the seller confirms the return.
 *
 * Also auto-closes `returned` → `completed` once the settlement window
 * (AUTO_COMPLETE_AFTER_RETURN_DAYS since `returnedAt`) has elapsed, so finished
 * rentals don't sit open if the seller forgets to close them.
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

  // Units that are about to go physically out the door (confirmed → renting today).
  const startingItems = await db.bookingItem.findMany({
    where: { unitId: { not: null }, booking: { status: "confirmed", startDate: { lte: todayStart } } },
    select: { unitId: true },
  });
  const rentingUnitIds = startingItems.map((i) => i.unitId).filter((id): id is string => !!id);

  // Auto-close bookings parked in `returned` past the settlement window.
  const completeCutoff = new Date(now.getTime() - AUTO_COMPLETE_AFTER_RETURN_DAYS * 24 * 3600 * 1000);

  // Null the item unit linkage for expired bookings BEFORE the status flip so the
  // WHERE clause (waiting_for_payment + overdue) still matches.
  await db.bookingItem.updateMany({
    where: { unitId: { not: null }, booking: { status: "waiting_for_payment", currentDueAt: { lt: now } } },
    data: { unitId: null },
  });

  const [expired, startedRenting, awaitingReturn, autoCompleted] = await Promise.all([
    // Forfeit the hold: a missed 3h payment window releases the reserved unit
    // (unit was never physically out, so its own status stays 'available').
    db.booking.updateMany({
      where: { status: "waiting_for_payment", currentDueAt: { lt: now } },
      data: { status: "payment_expired", cancelledBy: "system" },
    }),
    db.booking.updateMany({
      where: { status: "confirmed", startDate: { lte: todayStart } },
      data: { status: "renting" },
    }),
    // Last rental day has arrived: prompt the seller to receive the dress back.
    // Unit stays 'rented' (still physically out) until the seller confirms.
    db.booking.updateMany({
      where: { status: "renting", endDate: { lte: todayStart } },
      data: { status: "awaiting_return" },
    }),
    // Settlement window elapsed since the dress came back: auto-close the rental.
    db.booking.updateMany({
      where: { status: "returned", returnedAt: { lte: completeCutoff } },
      data: { status: "completed" },
    }),
  ]);

  // Mark the now-rented units physically out.
  if (rentingUnitIds.length > 0) {
    await db.productUnit.updateMany({
      where: { id: { in: rentingUnitIds } },
      data: { status: "rented" },
    });
  }

  return expired.count + startedRenting.count + awaitingReturn.count + autoCompleted.count;
}

/** Today's date in Asia/Bangkok as a YYYY-MM-DD string. */
function bangkokToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/** Add `days` to a YYYY-MM-DD string (UTC), returning YYYY-MM-DD. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Return-reminder sweep for bookings whose dress is physically out
 * (`renting` or `awaiting_return`):
 *   - DUE: rental end date has arrived → remind renter + seller it's time to
 *     return (guarded by returnReminderSentAt so it fires once).
 *   - OVERDUE: today is past endDate + returnWindowDays and still not returned →
 *     stronger nudge to both (guarded by overdueReminderSentAt).
 *
 * Deliberately does NOT auto-transition to `returned` — only the seller can
 * confirm the physical return. Idempotent: the sent-at guards prevent repeats.
 * Returns counts of reminders sent.
 */
export async function sendReturnReminders(): Promise<{ due: number; overdue: number }> {
  const today = bangkokToday();

  const candidates = await db.booking.findMany({
    where: {
      status: { in: ["renting", "awaiting_return"] },
      OR: [{ returnReminderSentAt: null }, { overdueReminderSentAt: null }],
    },
    select: {
      id: true,
      endDate: true,
      returnReminderSentAt: true,
      overdueReminderSentAt: true,
      renter: { select: { email: true } },
      items: { take: 1, select: { product: { select: { name: true, policyOverride: true, returnWindowDays: true } } } },
      shop: { select: { returnWindowDays: true, owner: { select: { email: true } } } },
    },
  });

  let due = 0;
  let overdue = 0;

  for (const b of candidates) {
    const endYmd = b.endDate.toISOString().slice(0, 10);
    const itemProduct = b.items[0]?.product;
    const returnWindow =
      itemProduct?.policyOverride && itemProduct.returnWindowDays != null
        ? itemProduct.returnWindowDays
        : (b.shop?.returnWindowDays ?? 0);
    const common = {
      renterEmail: b.renter?.email,
      sellerEmail: b.shop?.owner?.email,
      dressName: itemProduct?.name ?? "ชุดที่เช่า",
      endDate: b.endDate,
      bookingId: b.id,
    };

    if (!b.returnReminderSentAt && endYmd <= today) {
      notifyReturnDue(common);
      await db.booking.update({
        where: { id: b.id },
        data: { returnReminderSentAt: new Date() },
      });
      due++;
    }

    if (!b.overdueReminderSentAt && today > addDays(endYmd, returnWindow)) {
      notifyReturnOverdue(common);
      await db.booking.update({
        where: { id: b.id },
        data: { overdueReminderSentAt: new Date() },
      });
      overdue++;
    }
  }

  return { due, overdue };
}
