/**
 * lib/seller-calendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side data-fetching for the unified Seller Calendar page.
 * Fetches, for the logged-in user's shop, a date window of:
 *   • Active bookings (with product name + renter name + variantId + size)
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
import { ymdUtc } from "@/lib/date-th";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CalendarBooking = {
  id: string;
  productId: string;
  /** FK to the ProductVariant row (null for legacy bookings pre-variants). */
  variantId: string | null;
  productName: string;
  /** Snapshot recipient name → renter's full name fallback. */
  renterName: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: BookingStatus;
  /** Size string (e.g. "M", "L") from the booked variant. Null for legacy bookings. */
  size: string | null;
};

export type CalendarProduct = {
  id: string;
  name: string;
  /** First product image URL (public URL, render directly). Null if no images. */
  imageUrl: string | null;
  /**
   * Per-size stock information.
   * If the product has no ProductVariant rows (legacy), a single synthetic
   * entry is returned using the top-level Product.size + Product.available.
   */
  variants: Array<{ size: string; quantity: number; available: boolean }>;
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
const ymd = ymdUtc;

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
      variantId: true,
      startDate: true,
      endDate: true,
      status: true,
      recipientName: true,
      product: { select: { name: true } },
      renter: { select: { fullName: true } },
      variant: { select: { size: true } },
    },
    orderBy: { startDate: "asc" },
  });

  // ── 2. All products (for filter dropdown + blackout join) ────────────────
  const rawProducts = await db.product.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      name: true,
      size: true,
      available: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
      variants: {
        select: { size: true, quantity: true, available: true },
        orderBy: { size: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const productIds = rawProducts.map((p) => p.id);

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
      variantId: b.variantId,
      productName: b.product?.name ?? "สินค้า",
      // Prefer shipping-address snapshot name; fall back to account name
      renterName: b.recipientName ?? b.renter?.fullName ?? null,
      startDate: ymd(b.startDate),
      endDate: ymd(b.endDate),
      status: b.status as BookingStatus,
      size: b.variant?.size ? String(b.variant.size) : null,
    })),
    blackoutDates: rawBlackouts.map((bd) => ({
      productId: bd.productId,
      date: ymd(bd.date),
    })),
    closedDates: rawClosedDates.map((cd) => ({
      date: ymd(cd.date),
      note: cd.note,
    })),
    products: rawProducts.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.images[0]?.url ?? null,
      // If no variant rows exist, synthesise a single fallback from the legacy Product fields
      variants:
        p.variants.length > 0
          ? p.variants.map((v) => ({
              size: String(v.size),
              quantity: v.quantity,
              available: v.available,
            }))
          : [{ size: String(p.size), quantity: 1, available: p.available }],
    })),
  };
}
