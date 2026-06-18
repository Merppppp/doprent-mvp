/**
 * lib/date-th.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure Thai date-formatting utilities shared across server and client components.
 * No Node.js-only deps, no "use client" / "use server" directive, no Prisma.
 */

// ─── constants ───────────────────────────────────────────────────────────────

/** Short Thai month abbreviations (ม.ค. … ธ.ค.), 0-indexed. */
export const MONTHS_TH: string[] = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** Full Thai month names (มกราคม … ธันวาคม), 0-indexed. */
export const MONTHS_TH_FULL: string[] = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/**
 * Short Thai weekday labels, **Sun-first** (index 0 = Sunday).
 *
 * AvailabilityCalendar, ProductAvailabilityCalendar, and SellerCalendar all
 * render their weekday header starting on Sunday (อา).
 *
 * NOTE: DateRangePicker deliberately uses a Monday-first order (`TH_DOW`
 * defined locally in that file) — do NOT replace that constant with this one.
 */
export const DAYS_TH: string[] = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a `Date` to "YYYY-MM-DD" using the **local** clock.
 * Safe near midnight in Asia/Bangkok (avoids the UTC-offset bug that
 * `toISOString()` can introduce when the local wall-clock date differs from UTC).
 */
export function toLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Format a `Date` to "YYYY-MM-DD" using **UTC**.
 * Use this when the stored value is a UTC-midnight timestamp
 * (e.g. Prisma `DateTime` from the database such as `booking.startDate`).
 *
 * ⚠️  UTC vs local are semantically different near midnight in Asia/Bangkok (+7).
 *     Do NOT silently swap one for the other at a call site.
 */
export function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * "YYYY-MM-DD" → "DD/MM/YYYY".
 * Returns the input unchanged when it cannot be parsed.
 */
export function fmtThai(s: string): string {
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

/**
 * "YYYY-MM-DD" → "DD/MM/YY" with Buddhist Era year (2-digit).
 * Example: 2024-03-15 → "15/03/67".
 */
export function fmtThaiShort(s: string): string {
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${String(parseInt(y, 10) + 543).slice(-2)}`;
}

/**
 * "YYYY-MM-DD" → "D <full Thai month> <BE year>".
 * Example: 2024-03-15 → "15 มีนาคม 2567".
 * Uses `MONTHS_TH_FULL` (full month names).
 */
export function fmtThaiLong(s: string): string {
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${parseInt(d, 10)} ${MONTHS_TH_FULL[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`;
}
