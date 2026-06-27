import type { BookingStatus } from "@/lib/types";

export type RenterTabKey =
  | "all"
  | "pending"
  | "payment"
  | "renting"
  | "returning"
  | "completed"
  | "cancelled";

export type RenterTab = {
  key: RenterTabKey;
  label: string;
  statuses: BookingStatus[] | null;
};

export const RENTER_TABS: RenterTab[] = [
  { key: "all", label: "ทั้งหมด", statuses: null },
  { key: "pending", label: "รอยืนยัน", statuses: ["booking_pending"] },
  { key: "payment", label: "ที่ต้องชำระ", statuses: ["waiting_for_payment", "slip_disputed"] },
  { key: "renting", label: "กำลังเช่า", statuses: ["payment_review", "confirmed", "renting", "cancel_requested"] },
  { key: "returning", label: "รอส่งคืน", statuses: ["returned", "not_returned", "return_disputed"] },
  { key: "completed", label: "สำเร็จแล้ว", statuses: ["completed"] },
  { key: "cancelled", label: "ยกเลิก", statuses: ["rejected", "cancelled", "payment_expired"] },
];

export function statusesForRenterTab(key: RenterTabKey): BookingStatus[] | null {
  return RENTER_TABS.find((t) => t.key === key)?.statuses ?? null;
}

export const RENTER_PAGE_SIZE = 20;
