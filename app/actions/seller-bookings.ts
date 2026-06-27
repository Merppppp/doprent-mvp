"use server";

import { requireShopAccess } from "@/lib/shop-access";
import { getSellerBookingsPage, type SellerBookingCard } from "@/lib/booking-queries";
import { getTrustScores, type TrustScore } from "@/lib/trust-score";
import {
  statusesForFilter,
  cancelledByForFilter,
  type BookingFilterKey,
  SELLER_BOOKINGS_PAGE_SIZE,
} from "@/lib/seller-booking-tabs";

export type SellerBookingCardWithTrust = SellerBookingCard & {
  trust_score: TrustScore | null;
};

export type SellerBookingsPageResult = {
  rows: SellerBookingCardWithTrust[];
  total: number;
};

/**
 * Paginated fetch for the seller bookings list (tab + days-back filter +
 * infinite scroll). Authorization is enforced via requireShopAccess, so the
 * client only ever supplies the filter/skip — never a shopId.
 */
export async function fetchSellerBookingsPage(
  key: BookingFilterKey,
  sinceDays: number | null,
  skip: number,
): Promise<SellerBookingsPageResult> {
  const { shopId } = await requireShopAccess({ need: "bookings" });

  const { rows, total } = await getSellerBookingsPage(shopId, {
    statuses: statusesForFilter(key),
    cancelledBy: cancelledByForFilter(key),
    sinceDays,
    skip: Math.max(0, Math.trunc(skip)),
    take: SELLER_BOOKINGS_PAGE_SIZE,
  });

  // Batch trust scores for this page's renters (no N+1).
  const renterIds = [...new Set(rows.map((r) => r.renter_id))];
  const trust = await getTrustScores(renterIds);

  return {
    total,
    rows: rows.map((r) => ({ ...r, trust_score: trust.get(r.renter_id) ?? null })),
  };
}
