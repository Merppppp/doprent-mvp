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

/** Human-readable lines (Mon→Sun) for the public shop page. */
export function formatBusinessHoursLines(days: BusinessHours): string[] {
  return WEEKDAYS_MON_FIRST.map(({ idx, th }) => {
    const d = days[idx];
    if (!d || !d.open) return `${th}: ปิด`;
    return `${th}: ${d.from}–${d.to}`;
  });
}
