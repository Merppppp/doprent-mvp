import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getRenterBookingsPage, countRenterBookingsByStatus } from "@/lib/booking-queries";
import { expireOverdueBookings } from "@/lib/booking-expiry";
import { RENTER_PAGE_SIZE } from "@/lib/renter-booking-tabs";
import RenterBookingsList from "@/components/RenterBookingsList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "การจองของฉัน",
  robots: { index: false, follow: false },
};

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/bookings");

  await expireOverdueBookings();

  const [statusCounts, { rows, total }] = await Promise.all([
    countRenterBookingsByStatus(user.id),
    getRenterBookingsPage(user.id, {
      statuses: null,
      skip: 0,
      take: RENTER_PAGE_SIZE,
    }),
  ]);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 720 }}>
      <h1
        className="page-title"
        style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 16 }}
      >
        การจองของฉัน
      </h1>
      <RenterBookingsList
        initialRows={rows}
        initialTotal={total}
        statusCounts={statusCounts}
        initialTab={searchParams?.tab}
      />
    </div>
  );
}
