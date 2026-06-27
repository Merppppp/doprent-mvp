/**
 * lib/booking-policy.ts
 *
 * Pure, DB-free booking policy helpers. All functions are deterministic —
 * callers are responsible for loading data from the DB before calling.
 *
 * Booking statuses that hold a unit / block a slot (see BOOKING_BLOCKING_STATUSES):
 *   waiting_for_payment, payment_review, confirmed, renting
 * NON-blocking: booking_pending (awaiting shop accept — no hold yet),
 *   cancel_requested, slip_disputed, rejected, cancelled, payment_expired
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
  /** Transit days reserved AFTER the rental end (standard return shipping). Express collapses to 0. */
  bufferDaysAfter: number;
  /** Transit days reserved BEFORE the rental start (standard outbound shipping). Express collapses to 0. */
  bufferDaysBefore: number;
  /** Cleaning/preparation days after each rental (always reserved, regardless of shipping method). */
  cleaningDays: number;
  closedWeekdays: number[];
};

export type ProductPolicyOverride = {
  policyOverride: boolean;
  leadTimeDays: number | null;
  minRentalDays: number | null;
  maxRentalDays: number | null;
  returnWindowDays: number | null;
  bufferDaysAfter: number | null;
  bufferDaysBefore: number | null;
  cleaningDays: number | null;
};

export type EffectivePolicy = PolicySource;

/**
 * Shipping method for one leg. Only "express" collapses the transit buffer;
 * any other value (including "standard", null, legacy, or unknown strings) is
 * treated as standard (worst case). Kept as a widened string so DB rows
 * (string | null) flow in without coercion.
 */
export type ShippingMethod = string | null | undefined;

type BookingDateRange = {
  startDate: Date;
  endDate: Date;
  status: string;
  /** Outbound leg (shop→customer) — drives before-buffer. Defaults to standard. */
  outboundMethod?: ShippingMethod;
  /** Return leg (customer→shop) — drives after-buffer. Defaults to standard. */
  returnMethod?: ShippingMethod;
};

/**
 * Buffer days reserved before/after a rental, derived from shipping legs + cleaning.
 *   transitBefore = effectivePolicy.bufferDaysBefore (standard outbound transit, default 2)
 *   transitAfter  = effectivePolicy.bufferDaysAfter  (standard return transit, default 2)
 *   cleaning      = effectivePolicy.cleaningDays     (prep/wash after return, default 1)
 *
 *   before = outbound express → 0, else transitBefore
 *   after  = cleaning + (return express → 0, else transitAfter)
 *
 * Express collapses only its own transit leg. Cleaning is always reserved
 * regardless of shipping method. null/undefined (legacy bookings) is treated
 * as standard so the calendar always shows the worst case.
 */
export function shippingBuffers(
  policy: EffectivePolicy,
  outboundMethod: ShippingMethod,
  returnMethod: ShippingMethod,
): { before: number; after: number } {
  const transitBefore = policy.bufferDaysBefore ?? 2;
  const transitAfter = policy.bufferDaysAfter ?? 2;
  const cleaning = policy.cleaningDays ?? 1;
  const before = outboundMethod === "express" ? 0 : transitBefore;
  const after = cleaning + (returnMethod === "express" ? 0 : transitAfter);
  return { before, after };
}

/** One shipping leg, resolved for display (seller booking view). */
export type ShippingLeg = {
  method: "express" | "standard";
  /**
   * YYYY-MM-DD the shipment must go out:
   *  • outbound → ship by this date so it arrives by the rental start
   *    (express = the rental start date itself, same-day)
   *  • return  → the date the customer sends the dress back (rental end date)
   */
  shipBy: string;
  /** Transit days for this leg (0 for express). */
  transitDays: number;
  /** True when the leg is express (same-day, no transit reserved). */
  sameDay: boolean;
};

/**
 * Resolve when each leg of a booking must ship, from the effective policy +
 * the chosen methods. Pure — caller loads the policy (resolveEffectivePolicy)
 * and passes YYYY-MM-DD date strings. Mirrors `shippingBuffers`: express
 * collapses its transit to 0; standard reserves the policy's buffer days.
 */
export function bookingShippingPlan(
  policy: EffectivePolicy,
  startDate: string,
  endDate: string,
  outboundMethod: ShippingMethod,
  returnMethod: ShippingMethod,
): { outbound: ShippingLeg; return: ShippingLeg } {
  const transitBefore = policy.bufferDaysBefore ?? 2;
  const transitAfter = policy.bufferDaysAfter ?? 2;
  const outExpress = outboundMethod === "express";
  const retExpress = returnMethod === "express";
  return {
    outbound: {
      method: outExpress ? "express" : "standard",
      transitDays: outExpress ? 0 : transitBefore,
      shipBy: outExpress ? startDate : addDays(startDate, -transitBefore),
      sameDay: outExpress,
    },
    return: {
      // Customer sends the dress back on the rental end date; express arrives
      // same-day, standard takes transitAfter days to reach the shop.
      method: retExpress ? "express" : "standard",
      transitDays: retExpress ? 0 : transitAfter,
      shipBy: endDate,
      sameDay: retExpress,
    },
  };
}

// ---------------------------------------------------------------------------
// Active-status set — must stay in sync with BookingStatus enum + TRANSITIONS
// ---------------------------------------------------------------------------

/**
 * Statuses that block a calendar date in the *customer-facing* availability
 * view (date picker). A booking in any of these states is holding a unit: the
 * first four have committed the slot, and `renting` means the dress is
 * physically out the door (its return date may still be in the future, so it
 * must keep blocking/deducting stock until returned).
 *
 * Single source of truth: used by both computeUnavailableDates() and
 * computeDailyBookedCounts() so the calendar's "เต็ม" state and the remaining-
 * count badge can never disagree.
 */
export const BOOKING_BLOCKING_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  // NOTE: booking_pending is intentionally NOT here. A pending request does not
  // hold a unit — the hold begins only when the shop ACCEPTS (→ waiting_for_payment).
  // Multiple customers may hold overlapping pending requests for the same dates;
  // the shop resolves the conflict at accept time (see app/actions/bookings.ts).
  "waiting_for_payment",
  "payment_review",
  "confirmed",
  "renting",
  // awaiting_return: the dress is still physically out (past its end date but not
  // yet handed back) — keep blocking stock until the seller confirms the return.
  "awaiting_return",
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
      bufferDaysBefore: shop.bufferDaysBefore,
      cleaningDays: shop.cleaningDays,
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
    bufferDaysBefore: product.bufferDaysBefore ?? shop.bufferDaysBefore,
    cleaningDays: product.cleaningDays ?? shop.cleaningDays,
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
  /** Active bookings for this product (or a specific variant). */
  bookings: BookingDateRange[];
  effectivePolicy: EffectivePolicy;
  /** Window start (YYYY-MM-DD) — closed-weekday scan begins here. */
  rangeStart: string;
  /** Window end (YYYY-MM-DD) — closed-weekday scan ends here. */
  rangeEnd: string;
  /**
   * Stock quantity for the variant (or product when no variants).
   * A date is "full" when overlap_count >= quantity.
   * Defaults to 1 (single-unit = old behaviour, date blocked by any overlap).
   */
  quantity?: number;
};

/**
 * Returns the union of all unavailable dates (YYYY-MM-DD strings) for a
 * product within [rangeStart, rangeEnd].
 *
 * Components:
 *   1. ProductBlackoutDate entries
 *   2. ShopClosedDate entries
 *   3. For each blocking booking: the inclusive range
 *      [startDate − bufferDaysBefore .. endDate + bufferDaysAfter]
 *   4. All calendar dates whose weekday is in closedWeekdays within [rangeStart, rangeEnd]
 *
 * A booking blocks when its status is in BOOKING_BLOCKING_STATUSES
 * (waiting_for_payment, payment_review, confirmed, renting).
 */
export function computeUnavailableDates({
  blackouts,
  shopClosedDates,
  bookings,
  effectivePolicy,
  rangeStart,
  rangeEnd,
  quantity = 1,
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

  // 3. Active bookings block dates based on stock quantity.
  //    When quantity === 1 (single-unit, legacy default): any overlap blocks the date.
  //    When quantity > 1: a date is blocked only when overlap_count >= quantity.
  //    Buffer days after each booking are included (cleaning/preparation window).
  // Each blocking booking occupies its unit across
  //   [startDate − before  ..  endDate + after]
  // where before/after derive from that booking's own shipping legs (see
  // shippingBuffers). Legacy/null methods fall back to standard (worst case),
  // so the calendar shows the safe maximum hold for each existing booking.
  if (quantity <= 1) {
    // Fast path (legacy single-unit behaviour)
    for (const booking of bookings) {
      if (!BOOKING_BLOCKING_STATUSES.has(booking.status as BookingStatus)) continue;
      const { before, after } = shippingBuffers(
        effectivePolicy,
        booking.outboundMethod,
        booking.returnMethod,
      );
      const start = addDays(booking.startDate.toISOString().slice(0, 10), -before);
      const end = addDays(booking.endDate.toISOString().slice(0, 10), after);
      for (const d of dateRange(start, end)) {
        unavailable.add(d);
      }
    }
  } else {
    // Multi-unit path: count concurrent overlaps per date.
    const overlapCount = new Map<string, number>();
    for (const booking of bookings) {
      if (!BOOKING_BLOCKING_STATUSES.has(booking.status as BookingStatus)) continue;
      const { before, after } = shippingBuffers(
        effectivePolicy,
        booking.outboundMethod,
        booking.returnMethod,
      );
      const start = addDays(booking.startDate.toISOString().slice(0, 10), -before);
      const end = addDays(booking.endDate.toISOString().slice(0, 10), after);
      for (const d of dateRange(start, end)) {
        overlapCount.set(d, (overlapCount.get(d) ?? 0) + 1);
      }
    }
    for (const [d, count] of overlapCount) {
      if (count >= quantity) {
        unavailable.add(d);
      }
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
// 2b. computeDailyBookedCounts — per-date concurrent booking count
// ---------------------------------------------------------------------------

export type DailyBookedParams = {
  /** Bookings for a single variant (or product). Status is filtered here. */
  bookings: BookingDateRange[];
  /** Cleaning/preparation window appended after each booking's endDate. */
  bufferDaysAfter: number;
  /** Transit window reserved before each booking's startDate (worst-case standard shipping). */
  bufferDaysBefore?: number;
  /**
   * When provided, each booking's hold window is computed per-leg from its own
   * shipping methods via shippingBuffers(policy, …) instead of the flat
   * bufferDaysAfter/bufferDaysBefore above. Legacy/null methods fall back to
   * standard (worst case). The flat values remain the fallback for callers that
   * don't pass a policy (e.g. seller "out today" counts).
   */
  effectivePolicy?: EffectivePolicy;
  /**
   * Which statuses hold a unit. Pass BOOKING_BLOCKING_STATUSES for the
   * customer date-picker (keeps the remaining badge in lock-step with the
   * calendar) or lib/bookings.ACTIVE_STATUSES for physical "out today" counts
   * (includes `renting`).
   */
  statuses: ReadonlySet<string>;
};

/**
 * Returns a map of YYYY-MM-DD → number of concurrent active bookings on that
 * day, including the buffer days after each booking. This is the single
 * primitive both the customer remaining-qty badge and the seller inventory
 * view build on, so buffer handling and status filtering stay consistent.
 */
export function computeDailyBookedCounts({
  bookings,
  bufferDaysAfter,
  bufferDaysBefore = 0,
  effectivePolicy,
  statuses,
}: DailyBookedParams): Record<string, number> {
  const map: Record<string, number> = {};
  for (const b of bookings) {
    if (!statuses.has(b.status)) continue;
    const { before, after } = effectivePolicy
      ? shippingBuffers(effectivePolicy, b.outboundMethod, b.returnMethod)
      : { before: bufferDaysBefore, after: bufferDaysAfter };
    const start = addDays(b.startDate.toISOString().slice(0, 10), -before);
    const end = addDays(b.endDate.toISOString().slice(0, 10), after);
    for (const d of dateRange(start, end)) {
      map[d] = (map[d] ?? 0) + 1;
    }
  }
  return map;
}

/**
 * Given a daily-booked map (from computeDailyBookedCounts) and the variant's
 * total stock, returns how many units remain free across the inclusive range
 * [start, end] — i.e. quantity minus the peak concurrent bookings in the range.
 * Returns `quantity` when the range is empty/invalid (nothing booked yet).
 */
export function remainingForRange(
  dailyBooked: Record<string, number>,
  quantity: number,
  start: string,
  end: string,
): number {
  if (!start || !end || end < start) return quantity;
  let peak = 0;
  for (const d of dateRange(start, end)) {
    peak = Math.max(peak, dailyBooked[d] ?? 0);
  }
  return Math.max(0, quantity - peak);
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
  /**
   * Outbound leg (shop→customer) of THIS booking. Express collapses the
   * before-buffer to 0; standard (or null/legacy) reserves the transit window
   * ahead of startDate. See shippingBuffers.
   */
  outboundMethod?: ShippingMethod;
  /**
   * Return leg (customer→shop) of THIS booking. Express collapses its transit
   * portion of the after-buffer to 0; cleaning is always reserved.
   */
  returnMethod?: ShippingMethod;
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
  outboundMethod,
  returnMethod,
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

  // 5. No date in the held window is unavailable. The window extends before
  //    startDate by the outbound transit buffer (so the shop can ship in time)
  //    and after endDate by cleaning + return transit. Express legs collapse
  //    their transit portions; cleaning is always reserved. See shippingBuffers.
  const { before, after } = shippingBuffers(effectivePolicy, outboundMethod, returnMethod);
  const scanStart = addDays(startDate, -before);
  const scanEnd = addDays(endDate, after);
  for (const d of dateRange(scanStart, scanEnd)) {
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
