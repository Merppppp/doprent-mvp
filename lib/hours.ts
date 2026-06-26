/**
 * Structured weekly business hours.
 *
 * Stored as a JSON string in the existing `shops.hours` column (no migration).
 * Day index follows the same convention as `Shop.closedWeekdays`:
 *   0 = Sunday, 1 = Monday, … 6 = Saturday.
 *
 * Legacy rows hold free-text (not JSON) — `parseBusinessHours` returns null for
 * those so callers can fall back to showing the raw text unchanged.
 */

export type DayHours = { open: boolean; from: string; to: string };
/** Always length 7, indexed by weekday 0..6 (0 = Sunday). */
export type BusinessHours = DayHours[];

export const DEFAULT_FROM = "10:00";
export const DEFAULT_TO = "19:00";

/** Display order Monday → Sunday with Thai labels. */
export const WEEKDAYS_MON_FIRST: Array<{ idx: number; th: string }> = [
  { idx: 1, th: "จันทร์" },
  { idx: 2, th: "อังคาร" },
  { idx: 3, th: "พุธ" },
  { idx: 4, th: "พฤหัสบดี" },
  { idx: 5, th: "ศุกร์" },
  { idx: 6, th: "เสาร์" },
  { idx: 0, th: "อาทิตย์" },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isDayHours(x: unknown): x is DayHours {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.open === "boolean" &&
    typeof o.from === "string" &&
    typeof o.to === "string"
  );
}

/**
 * Parse the stored value into a 7-day schedule.
 * Returns null when the value is empty or legacy free-text (not our JSON shape),
 * so the caller can preserve/display the old text.
 */
export function parseBusinessHours(raw: string | null | undefined): BusinessHours | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    const days = Array.isArray(parsed)
      ? parsed
      : (parsed as { days?: unknown })?.days;
    if (!Array.isArray(days) || days.length !== 7 || !days.every(isDayHours)) return null;
    return days.map((d) => ({
      open: d.open,
      from: TIME_RE.test(d.from) ? d.from : DEFAULT_FROM,
      to: TIME_RE.test(d.to) ? d.to : DEFAULT_TO,
    }));
  } catch {
    return null;
  }
}

/** Seed a fresh schedule — all days open 10:00–19:00 except any closed weekdays. */
export function defaultBusinessHours(closedWeekdays: number[] = []): BusinessHours {
  const closed = new Set(closedWeekdays);
  return Array.from({ length: 7 }, (_, i) => ({
    open: !closed.has(i),
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  }));
}

export function serializeBusinessHours(days: BusinessHours): string {
  return JSON.stringify(days);
}

/** Weekday indices (0..6) that are marked closed — feeds Shop.closedWeekdays. */
export function closedWeekdaysFromHours(days: BusinessHours): number[] {
  return days
    .map((d, i) => (d.open ? -1 : i))
    .filter((i) => i >= 0);
}

// ---------------------------------------------------------------------------
// Shop-open time helpers (used for payment_review escalation badge)
// ---------------------------------------------------------------------------

/**
 * How many hours the shop was open between `since` and `now`, measured using
 * its configured weekly `BusinessHours` schedule (Asia/Bangkok timezone).
 *
 * Algorithm: iterate calendar days in Asia/Bangkok from the day of `since` to
 * the day of `now`. For each day, if the weekday is marked open, compute
 * that day's open window as absolute instants, intersect with [since, now],
 * and accumulate the overlap.
 *
 * NOTE: This is based purely on the CONFIGURED weekly schedule.
 * The shop's `isOpen` flag (ปิดร้านชั่วคราว) has no change-history, so we
 * cannot retroactively know during which intervals it was toggled. Callers
 * may suppress the badge if `shop.isOpen === false` right now, but the
 * elapsed time is always computed from the weekly schedule alone.
 *
 * Capped at 60-day spans to guard against pathological inputs (returns a
 * large sentinel value of 9999 if exceeded).
 */
export function openHoursElapsed(since: Date, now: Date, hours: BusinessHours): number {
  if (now <= since) return 0;

  // Cap at 60 days to avoid infinite loops on bad data.
  const MAX_DAYS = 60;
  const spanMs = now.getTime() - since.getTime();
  if (spanMs > MAX_DAYS * 86400 * 1000) return 9999;

  const TZ = "Asia/Bangkok";

  // Convert a Date to a "YYYY-MM-DD" calendar day string in Bangkok.
  function bkkDateStr(d: Date): string {
    return d.toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
  }

  // Given a "YYYY-MM-DD" string and "HH:MM" string, return a UTC Date for
  // that local time in Asia/Bangkok.
  function bkkInstant(dateStr: string, timeStr: string): Date {
    // e.g. "2025-06-25T10:00:00+07:00" → Bangkok is UTC+7
    return new Date(`${dateStr}T${timeStr}:00+07:00`);
  }

  // Get the weekday (0=Sun..6=Sat) for a "YYYY-MM-DD" in Bangkok.
  function bkkWeekday(dateStr: string): number {
    // Use noon to avoid any DST-edge ambiguity (Thailand is fixed UTC+7, no DST)
    return new Date(`${dateStr}T12:00:00+07:00`).getDay();
  }

  // Step through calendar days from sinceDay to nowDay inclusive.
  const sinceDay = bkkDateStr(since);
  const nowDay = bkkDateStr(now);

  let accumulated = 0;
  // Walk by advancing date strings (safe for up to MAX_DAYS)
  let cursor = sinceDay;

  while (cursor <= nowDay) {
    const weekday = bkkWeekday(cursor);
    const dayHours = hours[weekday];

    if (dayHours && dayHours.open) {
      const windowOpen = bkkInstant(cursor, dayHours.from);
      const windowClose = bkkInstant(cursor, dayHours.to);

      // Intersect [windowOpen, windowClose] with [since, now]
      const overlapStart = since > windowOpen ? since : windowOpen;
      const overlapEnd = now < windowClose ? now : windowClose;

      if (overlapEnd > overlapStart) {
        accumulated += (overlapEnd.getTime() - overlapStart.getTime()) / 3600000;
      }
    }

    // Advance cursor by one calendar day
    const next = new Date(`${cursor}T12:00:00+07:00`);
    next.setDate(next.getDate() + 1);
    cursor = bkkDateStr(next);
  }

  return accumulated;
}

/**
 * Returns true when a `payment_review` booking has exceeded the escalation
 * threshold measured in shop-open hours.
 *
 * Pass `thresholdHours` explicitly (import from lib/bookings) to avoid a
 * circular-import between lib/hours ↔ lib/bookings.
 */
export function paymentReviewEscalated(
  paymentReviewAt: Date | null,
  hours: BusinessHours,
  thresholdHours: number,
  now = new Date(),
): boolean {
  if (!paymentReviewAt) return false;
  return openHoursElapsed(paymentReviewAt, now, hours) >= thresholdHours;
}

/** Human-readable lines (Mon→Sun) for the public shop page. */
export function formatBusinessHoursLines(days: BusinessHours): string[] {
  return WEEKDAYS_MON_FIRST.map(({ idx, th }) => {
    const d = days[idx];
    if (!d || !d.open) return `${th}: ปิด`;
    return `${th}: ${d.from}–${d.to}`;
  });
}
