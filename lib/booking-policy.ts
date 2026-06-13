/**
 * lib/booking-policy.ts
 *
 * Pure, DB-free booking policy helpers. All functions are deterministic —
 * callers are responsible for loading data from the DB before calling.
 *
 * Active booking statuses (those that hold a product's slot):
 *   booking_pending, waiting_for_payment, payment_review, confirmed
 * Inactive (do NOT block): cancel_requested, slip_disputed, rejected,
 *   cancelled, payment_expired
 */

import type { BookingStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types — minimal shape accepted by the helpers (avoid coupling to Prisma types)
// ---------------------------------------------------------------------------

export type PolicySource = {
  leadTimeDays: number;
  minRentalDays: number;
  maxRentalDays: number | null;
  returnWindowDays: number;
  bufferDaysAfter: number;
  closedWeekdays: number[];
};

export type ProductPolicyOverride = {
  policyOverride: boolean;
  leadTimeDays: number | null;
  minRentalDays: number | null;
  maxRentalDays: number | null;
  returnWindowDays: number | null;
  bufferDaysAfter: number | null;
};

export type EffectivePolicy = PolicySource;

type BookingDateRange = {
  startDate: Date;
  endDate: Date;
  status: string;
};

// ---------------------------------------------------------------------------
// Active-status set — must stay in sync with BookingStatus enum + TRANSITIONS
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES = new Set<BookingStatus>([
  "booking_pending",
  "waiting_for_payment",
  "payment_review",
  "confirmed",
]);

// ---------------------------------------------------------------------------
// 1. resolveEffectivePolicy
// ---------------------------------------------------------------------------

/**
 * Returns the policy that governs a booking for a specific product.
 *
 * If product.policyOverride === true, each numeric field uses the product's
 * own value when non-null, falling back to the shop's value.
 * maxRentalDays is treated as "null means unlimited" ONLY when policyOverride
 * is true — a null product override with policyOverride true still means
 * unlimited (not "fall back to shop").
 *
 * closedWeekdays always comes from the shop (not per-product).
 */
export function resolveEffectivePolicy(
  shop: PolicySource,
  product: ProductPolicyOverride,
): EffectivePolicy {
  if (!product.policyOverride) {
    return {
      leadTimeDays: shop.leadTimeDays,
      minRentalDays: shop.minRentalDays,
      maxRentalDays: shop.maxRentalDays,
      returnWindowDays: shop.returnWindowDays,
      bufferDaysAfter: shop.bufferDaysAfter,
      closedWeekdays: shop.closedWeekdays,
    };
  }

  return {
    // For each numeric field: use product value when non-null, else shop value.
    leadTimeDays: product.leadTimeDays ?? shop.leadTimeDays,
    minRentalDays: product.minRentalDays ?? shop.minRentalDays,
    // maxRentalDays: when policyOverride=true, null means "unlimited" (override explicit).
    // We distinguish null-as-override vs null-as-fallback via the policyOverride flag.
    maxRentalDays: product.maxRentalDays !== undefined
      ? product.maxRentalDays  // could be null (unlimited) or a number
      : shop.maxRentalDays,
    returnWindowDays: product.returnWindowDays ?? shop.returnWindowDays,
    bufferDaysAfter: product.bufferDaysAfter ?? shop.bufferDaysAfter,
    // closedWeekdays is shop-level only
    closedWeekdays: shop.closedWeekdays,
  };
}

// ---------------------------------------------------------------------------
// 2. computeUnavailableDates
// ---------------------------------------------------------------------------

/** Add `days` calendar days to a YYYY-MM-DD string (UTC). */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Enumerate all YYYY-MM-DD strings in [start, end] inclusive (UTC). */
function dateRange(start: string, end: string): string[] {
  const result: string[] = [];
  let cur = start;
  while (cur <= end) {
    result.push(cur);
    cur = addDays(cur, 1);
  }
  return result;
}

/** Return the weekday (0=Sunday..6=Saturday) of a YYYY-MM-DD string (UTC). */
function weekday(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

export type ComputeUnavailableParams = {
  /** ProductBlackoutDate.date strings (YYYY-MM-DD) for this product. */
  blackouts: string[];
  /** ShopClosedDate.date strings (YYYY-MM-DD) for the shop. */
  shopClosedDates: string[];
  /** Active bookings for this product (startDate/endDate as Date objects). */
  bookings: BookingDateRange[];
  effectivePolicy: EffectivePolicy;
  /** Window start (YYYY-MM-DD) — closed-weekday scan begins here. */
  rangeStart: string;
  /** Window end (YYYY-MM-DD) — closed-weekday scan ends here. */
  rangeEnd: string;
};

/**
 * Returns the union of all unavailable dates (YYYY-MM-DD strings) for a
 * product within [rangeStart, rangeEnd].
 *
 * Components:
 *   1. ProductBlackoutDate entries
 *   2. ShopClosedDate entries
 *   3. For each ACTIVE booking: the inclusive range [startDate .. endDate + bufferDaysAfter]
 *   4. All calendar dates whose weekday is in closedWeekdays within [rangeStart, rangeEnd]
 *
 * A booking is "active" if its status is one of:
 *   booking_pending, waiting_for_payment, payment_review, confirmed
 */
export function computeUnavailableDates({
  blackouts,
  shopClosedDates,
  bookings,
  effectivePolicy,
  rangeStart,
  rangeEnd,
}: ComputeUnavailableParams): Set<string> {
  const unavailable = new Set<string>();

  // 1. ProductBlackoutDate dates
  for (const d of blackouts) {
    unavailable.add(d);
  }

  // 2. ShopClosedDate dates
  for (const d of shopClosedDates) {
    unavailable.add(d);
  }

  // 3. Active bookings block [startDate .. endDate + bufferDaysAfter]
  for (const booking of bookings) {
    if (!ACTIVE_STATUSES.has(booking.status as BookingStatus)) continue;
    const start = booking.startDate.toISOString().slice(0, 10);
    const end = addDays(booking.endDate.toISOString().slice(0, 10), effectivePolicy.bufferDaysAfter);
    for (const d of dateRange(start, end)) {
      unavailable.add(d);
    }
  }

  // 4. Recurring closed weekdays within the scan window
  if (effectivePolicy.closedWeekdays.length > 0) {
    const closedSet = new Set(effectivePolicy.closedWeekdays);
    for (const d of dateRange(rangeStart, rangeEnd)) {
      if (closedSet.has(weekday(d))) {
        unavailable.add(d);
      }
    }
  }

  return unavailable;
}

// ---------------------------------------------------------------------------
// 3. validateBookingRange
// ---------------------------------------------------------------------------

export type ValidateBookingRangeParams = {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  effectivePolicy: EffectivePolicy;
  unavailableDates: Set<string>;
  /** Today's date (YYYY-MM-DD, UTC). */
  today: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validates that [startDate, endDate] satisfies the effective policy.
 * Returns the first failing rule as a Thai-friendly message.
 *
 * Checks (in order):
 *   1. endDate >= startDate
 *   2. startDate >= today + leadTimeDays
 *   3. nights (inclusive: endDate - startDate + 1) >= minRentalDays
 *   4. nights <= maxRentalDays (when not null)
 *   5. No date in [startDate, endDate] is in unavailableDates
 *   6. startDate weekday is not in closedWeekdays
 */
export function validateBookingRange({
  startDate,
  endDate,
  effectivePolicy,
  unavailableDates,
  today,
}: ValidateBookingRangeParams): ValidationResult {
  const { leadTimeDays, minRentalDays, maxRentalDays, closedWeekdays } = effectivePolicy;

  // 1. endDate >= startDate
  if (endDate < startDate) {
    return { ok: false, error: "วันคืนชุดต้องไม่ก่อนวันรับ" };
  }

  // 2. startDate >= today + leadTimeDays
  const earliestStart = addDays(today, leadTimeDays);
  if (startDate < earliestStart) {
    return {
      ok: false,
      error:
        leadTimeDays === 0
          ? "วันเริ่มต้องไม่เป็นวันที่ผ่านมา"
          : `ต้องจองล่วงหน้าอย่างน้อย ${leadTimeDays} วัน`,
    };
  }

  // 3. Inclusive night count >= minRentalDays
  const nights = nightsBetween(startDate, endDate);
  if (nights < minRentalDays) {
    return {
      ok: false,
      error: `จำนวนวันเช่าขั้นต่ำ ${minRentalDays} วัน (เลือก ${nights} วัน)`,
    };
  }

  // 4. nights <= maxRentalDays (when set)
  if (maxRentalDays !== null && nights > maxRentalDays) {
    return {
      ok: false,
      error: `จำนวนวันเช่าสูงสุด ${maxRentalDays} วัน (เลือก ${nights} วัน)`,
    };
  }

  // 5. No date in range is unavailable
  for (const d of dateRange(startDate, endDate)) {
    if (unavailableDates.has(d)) {
      return { ok: false, error: `วันที่ ${formatThai(d)} ไม่ว่าง กรุณาเลือกวันอื่น` };
    }
  }

  // 6. startDate weekday must not be in closedWeekdays
  if (closedWeekdays.includes(weekday(startDate))) {
    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
    return {
      ok: false,
      error: `ร้านปิดทำการวัน${dayNames[weekday(startDate)]}`,
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Inclusive day count between two YYYY-MM-DD dates.
 * Matches the existing nightsBetween / rentalDays(start, end) = end - start + 1.
 */
export function nightsBetween(startDate: string, endDate: string): number {
  const s = new Date(startDate + "T00:00:00Z").getTime();
  const e = new Date(endDate + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((e - s) / (24 * 3600 * 1000)) + 1);
}

function formatThai(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)}/${parseInt(m)}`;
}
