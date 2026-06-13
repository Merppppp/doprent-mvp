/**
 * lib/seller-calendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side data-fetching for the unified Seller Calendar page.
 * Fetches, for the logged-in user's shop, a date window of:
 *   • Active bookings (with product name + renter name)
 *   • ProductBlackoutDates for every shop product
 *   • ShopClosedDates
 *   • Shop.closedWeekdays
 *
 * All dates are serialised as YYYY-MM-DD strings so the payload is safe to
 * pass from a Server Component to a 'use client' component.
 */

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ACTIVE_STATUSES } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CalendarBooking = {
  id: string;
  productId: string;
  productName: string;
  /** Snapshot recipient name → renter's full name fallback. */
  renterName: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: BookingStatus;
};

export type CalendarProduct = {
  id: string;
  name: string;
};

export type SellerCalendarData = {
  shopId: string;
  shopName: string;
  /** ISO weekday indices (0=Sun … 6=Sat) the shop is always closed. */
  closedWeekdays: number[];
  bookings: CalendarBooking[];
  blackoutDates: Array<{ productId: string; date: string }>;
  closedDates: Array<{ date: string; note: string | null }>;
  products: CalendarProduct[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a JS Date to "YYYY-MM-DD" using UTC (Prisma @db.Date comes back as
 *  UTC midnight, so UTC string avoids the off-by-one timezone bug). */
const ymd = (d: Date): string => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Main fetch
// ---------------------------------------------------------------------------

/**
 * Returns all calendar data for the current user's shop.
 * Returns null if the user is not logged in or has no shop.
 *
 * Date window: 2 months before today → 6 months after today (8 months total).
 * This gives the client calendar enough data to navigate without another
 * round-trip.
 */
export async function getSellerCalendarData(): Promise<SellerCalendarData | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;

  const shop = await db.shop.findFirst({
    where: { ownerId: user.id },
    select: { id: true, name: true, closedWeekdays: true },
  });
  if (!shop) return null;

  const now = new Date();
  /** First day, 2 months back */
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  /** Last day, 6 months forward (getMonth() + 7 → month after target; day 0 → last day of target) */
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 7, 0);

  // ── 1. Active bookings ───────────────────────────────────────────────────
  const rawBookings = await db.booking.findMany({
    where: {
      shopId: shop.id,
      status: { in: ACTIVE_STATUSES },
      // Overlap: booking overlaps window if startDate <= windowEnd AND endDate >= windowStart
      startDate: { lte: windowEnd },
      endDate: { gte: windowStart },
    },
    select: {
      id: true,
      productId: true,
      startDate: true,
      endDate: true,
      status: true,
      recipientName: true,
      product: { select: { name: true } },
      renter: { select: { fullName: true } },
    },
    orderBy: { startDate: "asc" },
  });

  // ── 2. All products (for filter dropdown + blackout join) ────────────────
  const products = await db.product.findMany({
    where: { shopId: shop.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const productIds = products.map((p) => p.id);

  // ── 3. Product blackout dates ────────────────────────────────────────────
  const rawBlackouts =
    productIds.length > 0
      ? await db.productBlackoutDate.findMany({
          where: {
            productId: { in: productIds },
            date: { gte: windowStart, lte: windowEnd },
          },
          select: { productId: true, date: true },
        })
      : [];

  // ── 4. Shop closed dates ─────────────────────────────────────────────────
  const rawClosedDates = await db.shopClosedDate.findMany({
    where: {
      shopId: shop.id,
      date: { gte: windowStart, lte: windowEnd },
    },
    select: { date: true, note: true },
  });

  // ── Serialise and return ─────────────────────────────────────────────────
  return {
    shopId: shop.id,
    shopName: shop.name,
    closedWeekdays: shop.closedWeekdays,
    bookings: rawBookings.map((b) => ({
      id: b.id,
      productId: b.productId,
      productName: b.product?.name ?? "สินค้า",
      // Prefer shipping-address snapshot name; fall back to account name
      renterName: b.recipientName ?? b.renter?.fullName ?? null,
      startDate: ymd(b.startDate),
      endDate: ymd(b.endDate),
      status: b.status as BookingStatus,
    })),
    blackoutDates: rawBlackouts.map((bd) => ({
      productId: bd.productId,
      date: ymd(bd.date),
    })),
    closedDates: rawClosedDates.map((cd) => ({
      date: ymd(cd.date),
      note: cd.note,
    })),
    products,
  };
}
