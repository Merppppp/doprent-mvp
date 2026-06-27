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

export type BookingGroupKey = "all" | "todo" | "active" | "done" | "cancelled";

/** A filter key is either a group or an exact tab key. */
export type BookingFilterKey = BookingGroupKey | BookingTabKey;

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

/** 5 primary groups that the UI exposes as the first-level segmented bar. */
export const BOOKING_GROUPS: ReadonlyArray<{
  key: BookingGroupKey;
  label: string;
  shortLabel?: string;
  emphasis?: true;
  memberTabs: BookingTabKey[];
}> = [
  { key: "all",       label: "ทั้งหมด",      memberTabs: [] },
  { key: "todo",      label: "ต้องทำ",       emphasis: true, memberTabs: ["booking_pending", "payment_review", "returned"] },
  { key: "active",    label: "กำลังดำเนิน",  shortLabel: "ดำเนิน", memberTabs: ["waiting_for_payment", "confirmed", "renting", "awaiting_return"] },
  { key: "done",      label: "จบงาน",        memberTabs: [] },
  { key: "cancelled", label: "ยกเลิก",       memberTabs: ["cancelled_shop", "cancelled_renter"] },
];

// ─── existing tab helpers ───────────────────────────────────────────────────

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

// ─── group / filter helpers ─────────────────────────────────────────────────

const GROUP_KEYS = new Set<string>(BOOKING_GROUPS.map((g) => g.key));
const TAB_KEYS   = new Set<string>(BOOKING_TABS.map((t) => t.key));

function isGroupKey(key: BookingFilterKey): key is BookingGroupKey {
  return GROUP_KEYS.has(key) && !isExactTabKey(key);
}

function isExactTabKey(key: BookingFilterKey): key is BookingTabKey {
  // "all" is in both sets; treat it as a tab key so it resolves to null statuses
  // directly via statusesForTab. When the caller wants the group "all" they still
  // pass "all" — the resolver returns null either way.
  return TAB_KEYS.has(key);
}

function dedup(arr: BookingStatus[]): BookingStatus[] {
  return [...new Set(arr)];
}

/**
 * Given a filter key (group or exact tab), return the statuses array to pass
 * to getSellerBookingsPage (null = all statuses).
 */
export function statusesForFilter(key: BookingFilterKey): BookingStatus[] | null {
  switch (key) {
    case "all":
      return null;

    case "todo": {
      const s = [
        ...((statusesForTab("booking_pending") as BookingStatus[]) ?? []),
        ...((statusesForTab("payment_review") as BookingStatus[]) ?? []),
        ...((statusesForTab("returned") as BookingStatus[]) ?? []),
      ];
      return dedup(s);
    }

    case "active": {
      const s = [
        ...((statusesForTab("waiting_for_payment") as BookingStatus[]) ?? []),
        ...((statusesForTab("confirmed") as BookingStatus[]) ?? []),
        ...((statusesForTab("renting") as BookingStatus[]) ?? []),
        ...((statusesForTab("awaiting_return") as BookingStatus[]) ?? []),
      ];
      return dedup(s);
    }

    case "done":
      return ["completed"];

    case "cancelled": {
      const s = [
        ...((statusesForTab("cancelled_shop") as BookingStatus[]) ?? []),
        ...((statusesForTab("cancelled_renter") as BookingStatus[]) ?? []),
      ];
      return dedup(s);
    }

    default:
      // exact BookingTabKey — fall through to the tab resolver
      return statusesForTab(key as BookingTabKey);
  }
}

/**
 * For group keys, return null (combine shop + renter cancelled).
 * For exact tab keys, delegate to cancelledByForTab (so sub-chips still
 * disambiguate cancelled_shop vs cancelled_renter correctly).
 */
export function cancelledByForFilter(key: BookingFilterKey): string[] | null {
  // All known group keys → no cancelledBy filter
  if (key === "all" || key === "todo" || key === "active" || key === "done" || key === "cancelled") {
    return null;
  }
  // Otherwise it's an exact tab key
  return cancelledByForTab(key as BookingTabKey);
}

/**
 * Given a raw DB status string, find which group it belongs to and which
 * member tab (sub-chip) matches it. Used for deep-link initialStatus routing.
 */
export function groupForStatus(
  status: string,
): { group: BookingGroupKey; sub: BookingTabKey | null } {
  // Special case: completed → "done" (no member tabs)
  if (status === "completed") {
    return { group: "done", sub: null };
  }

  // Walk each group's member tabs and check if any statuses match
  for (const grp of BOOKING_GROUPS) {
    if (grp.memberTabs.length === 0) continue;
    for (const tabKey of grp.memberTabs) {
      const tabStatuses = statusesForTab(tabKey);
      if (tabStatuses && tabStatuses.includes(status as BookingStatus)) {
        return { group: grp.key, sub: tabKey };
      }
    }
  }

  // Fallback: "all" group, no sub
  return { group: "all", sub: null };
}

// ─── count helpers ──────────────────────────────────────────────────────────

/** "View bookings created within the last N days" options; null = all time. */
export const DAYS_BACK_OPTIONS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: 7, label: "7 วันล่าสุด" },
  { value: 30, label: "30 วันล่าสุด" },
  { value: 90, label: "90 วันล่าสุด" },
  { value: null, label: "ทั้งหมด" },
];
