import type { BookingStatus } from "@/lib/types";

/** How many booking cards load per page (initial render + each scroll). */
export const SELLER_BOOKINGS_PAGE_SIZE = 20;

export type BookingTabKey = "all" | "action" | "active" | "admin" | "done" | "closed";

/**
 * Seller-facing status groups. `statuses: null` means "no status filter" (all).
 * Order here is the tab order shown in the UI.
 */
export const BOOKING_TABS: ReadonlyArray<{
  key: BookingTabKey;
  label: string;
  statuses: BookingStatus[] | null;
}> = [
  { key: "all", label: "ทั้งหมด", statuses: null },
  { key: "action", label: "รอจัดการ", statuses: ["booking_pending", "payment_review", "returned"] },
  { key: "active", label: "กำลังเช่า", statuses: ["waiting_for_payment", "confirmed"] },
  { key: "admin", label: "รอแอดมิน", statuses: ["cancel_requested", "slip_disputed"] },
  { key: "done", label: "เสร็จสิ้น", statuses: ["completed"] },
  { key: "closed", label: "ยกเลิก", statuses: ["rejected", "cancelled", "payment_expired"] },
];

export function statusesForTab(key: BookingTabKey): BookingStatus[] | null {
  return BOOKING_TABS.find((t) => t.key === key)?.statuses ?? null;
}

/** "View bookings created within the last N days" options; null = all time. */
export const DAYS_BACK_OPTIONS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: 7, label: "7 วันล่าสุด" },
  { value: 30, label: "30 วันล่าสุด" },
  { value: 90, label: "90 วันล่าสุด" },
  { value: null, label: "ทั้งหมด" },
];
