import { db } from "@/lib/db";
import { AUTO_COMPLETE_AFTER_RETURN_DAYS } from "@/lib/bookings";
import { notifyReturnDue, notifyReturnOverdue } from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Job 1: Payment expiry (every 5 min)
// ---------------------------------------------------------------------------

/**
 * Flips `waiting_for_payment` bookings past their `currentDueAt` to
 * `payment_expired` and releases the reserved unit.
 *
 * Idempotent — concurrent sweeps match zero rows.
 */
export async function expirePayments(): Promise<{ expired: number }> {
  const now = new Date();

  // Null the item unit linkage BEFORE the status flip so the WHERE clause
  // (waiting_for_payment + overdue) still matches.
  await db.bookingItem.updateMany({
    where: { unitId: { not: null }, booking: { status: "waiting_for_payment", currentDueAt: { lt: now } } },
    data: { unitId: null },
  });

  const expired = await db.booking.updateMany({
    where: { status: "waiting_for_payment", currentDueAt: { lt: now } },
    data: { status: "payment_expired", cancelledBy: "system" },
  });

  return { expired: expired.count };
}

// ---------------------------------------------------------------------------
// Job 2: Daily lifecycle (once/day 00:05 Bangkok)
// ---------------------------------------------------------------------------

/**
 * Date-based status transitions that only change at day boundaries:
 *   - `confirmed` → `renting` (startDate arrived)
 *   - `renting` → `awaiting_return` (endDate arrived)
 *   - `returned` → `completed` (settlement window elapsed)
 *
 * Also marks units as `rented` when the rental physically starts.
 * Idempotent — concurrent sweeps match zero rows.
 */
export async function advanceDailyLifecycle(): Promise<{
  startedRenting: number;
  awaitingReturn: number;
  autoCompleted: number;
}> {
  const now = new Date();
  const todayStart = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  todayStart.setHours(0, 0, 0, 0);

  // Units about to go physically out the door (confirmed → renting today).
  const startingItems = await db.bookingItem.findMany({
    where: { unitId: { not: null }, booking: { status: "confirmed", startDate: { lte: todayStart } } },
    select: { unitId: true },
  });
  const rentingUnitIds = startingItems.map((i) => i.unitId).filter((id): id is string => !!id);

  const completeCutoff = new Date(now.getTime() - AUTO_COMPLETE_AFTER_RETURN_DAYS * 24 * 3600 * 1000);

  const [startedRenting, awaitingReturn, autoCompleted] = await Promise.all([
    db.booking.updateMany({
      where: { status: "confirmed", startDate: { lte: todayStart } },
      data: { status: "renting" },
    }),
    db.booking.updateMany({
      where: { status: "renting", endDate: { lte: todayStart } },
      data: { status: "awaiting_return" },
    }),
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

  return {
    startedRenting: startedRenting.count,
    awaitingReturn: awaitingReturn.count,
    autoCompleted: autoCompleted.count,
  };
}

// ---------------------------------------------------------------------------
// Combined (backward-compat for lazy page-load sweep)
// ---------------------------------------------------------------------------

/**
 * Runs ALL auto-transitions in one shot. Called opportunistically at the
 * top of booking list loaders so users never see stale bookings.
 * For scheduled cron, use the individual functions above instead.
 */
export async function expireOverdueBookings(): Promise<number> {
  const { expired } = await expirePayments();
  const { startedRenting, awaitingReturn, autoCompleted } = await advanceDailyLifecycle();
  return expired + startedRenting + awaitingReturn + autoCompleted;
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
