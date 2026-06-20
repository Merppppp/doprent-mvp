"use server";

import { getCurrentUser } from "@/lib/auth";
import { getRenterBookingsPage, type RenterBookingCard } from "@/lib/booking-queries";
import {
  statusesForRenterTab,
  type RenterTabKey,
  RENTER_PAGE_SIZE,
} from "@/lib/renter-booking-tabs";

export type RenterBookingsPageResult = {
  rows: RenterBookingCard[];
  total: number;
};

export async function fetchRenterBookingsPage(
  tab: RenterTabKey,
  skip: number,
  search?: string | null,
): Promise<RenterBookingsPageResult> {
  const user = await getCurrentUser();
  if (!user) return { rows: [], total: 0 };

  return getRenterBookingsPage(user.id, {
    statuses: statusesForRenterTab(tab),
    search: search || null,
    skip: Math.max(0, Math.trunc(skip)),
    take: RENTER_PAGE_SIZE,
  });
}
