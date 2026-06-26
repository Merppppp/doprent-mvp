import type { BookingStatus } from "@/lib/types";

/** How many booking cards load per page (initial render + each scroll). */
export const SELLER_BOOKINGS_PAGE_SIZE = 20;

export type BookingTabKey =
  | "all"
  | "booking_pending"
  | "waiting_for_payment"
  | "payment_review"
  | "confirmed"
  | "renting"
  | "awaiting_return"
  | "returned"
  | "completed"
  | "cancelled_shop"
  | "cancelled_renter";

/**
 * Seller-facing status tabs — each maps to one or more DB statuses.
 * Order here is the tab order shown in the UI.
 */
export const BOOKING_TABS: ReadonlyArray<{
  key: BookingTabKey;
  label: string;
  statuses: BookingStatus[] | null;
}> = [
  { key: "all", label: "ทั้งหมด", statuses: null },
  { key: "booking_pending", label: "รอยืนยัน", statuses: ["booking_pending"] },
  { key: "waiting_for_payment", label: "รอจ่าย", statuses: ["waiting_for_payment"] },
  { key: "payment_review", label: "ตรวจสลิป", statuses: ["payment_review", "slip_disputed"] },
  { key: "confirmed", label: "ยืนยันแล้ว", statuses: ["confirmed"] },
  { key: "renting", label: "กำลังเช่า", statuses: ["renting"] },
  { key: "awaiting_return", label: "รอคืนของ", statuses: ["awaiting_return"] },
  { key: "returned", label: "รอตรวจคืน", statuses: ["returned"] },
  { key: "completed", label: "จบงาน", statuses: ["completed"] },
  { key: "cancelled_shop", label: "ยกเลิกโดยร้าน", statuses: ["rejected", "cancelled", "cancel_requested"] },
  { key: "cancelled_renter", label: "ยกเลิกโดยผู้เช่า", statuses: ["cancelled", "payment_expired"] },
];

export function statusesForTab(key: BookingTabKey): BookingStatus[] | null {
  return BOOKING_TABS.find((t) => t.key === key)?.statuses ?? null;
}

/** cancelled_shop / cancelled_renter share the "cancelled" DB status but differ
 *  on who initiated it. Return the cancelledBy filter values for these tabs. */
export function cancelledByForTab(key: BookingTabKey): string[] | null {
  if (key === "cancelled_shop") return ["shop", "admin"];
  if (key === "cancelled_renter") return ["renter", "system"];
  return null;
}

/** "View bookings created within the last N days" options; null = all time. */
export const DAYS_BACK_OPTIONS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: 7, label: "7 วันล่าสุด" },
  { value: 30, label: "30 วันล่าสุด" },
  { value: 90, label: "90 วันล่าสุด" },
  { value: null, label: "ทั้งหมด" },
];
