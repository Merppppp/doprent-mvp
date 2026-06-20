import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireShopAccess } from "@/lib/shop-access";
import { expireOverdueBookings } from "@/lib/booking-expiry";
import { getSellerBookingsPage, countBookingsByStatus } from "@/lib/booking-queries";
import { getTrustScores } from "@/lib/trust-score";
import { SELLER_BOOKINGS_PAGE_SIZE } from "@/lib/seller-booking-tabs";
import SellerBookingsList from "@/components/SellerBookingsList";
import type { SellerBookingCardWithTrust } from "@/app/actions/seller-bookings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "การจองของร้าน",
  robots: { index: false, follow: false },
};

export default async function SellerBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const access = await requireShopAccess({ need: "bookings" }).catch(() => null);
  if (!access) redirect("/login?next=/sell/bookings");

  // Lazy payment-expiry sweep so stale waiting_for_payment rows never show.
  await expireOverdueBookings();

  // Fetch booking counts per status for the block cards
  const statusCounts = await countBookingsByStatus(access.shopId);

  // Server-render the first page for the default tab ("all", all time); the
  // client component takes over for tab switches, day filters and infinite scroll.
  const { rows, total } = await getSellerBookingsPage(access.shopId, {
    statuses: null,
    sinceDays: null,
    skip: 0,
    take: SELLER_BOOKINGS_PAGE_SIZE,
  });
  const renterIds = [...new Set(rows.map((r) => r.renter_id))];
  const trust = await getTrustScores(renterIds);
  const initialRows: SellerBookingCardWithTrust[] = rows.map((r) => ({
    ...r,
    trust_score: trust.get(r.renter_id) ?? null,
  }));

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 className="seller-h1" style={{ marginBottom: 20 }}>
        การจองของร้าน
      </h1>
      <SellerBookingsList
        initialRows={initialRows}
        initialTotal={total}
        statusCounts={statusCounts}
        initialStatus={searchParams?.status}
      />
    </div>
  );
}
