import type { PriceTier } from "./types";

/**
 * Single source of truth for duration-based rental pricing.
 *
 * A dress may define `price_tiers`: contiguous day ranges (starting at 1, last
 * one open-ended with max=null), each carrying a per-day rate. The charge for a
 * booking of N nights = the matching tier's per_day × N. When a dress has no
 * tiers, everything falls back to its flat `price_per_day`.
 *
 * Card display, the date picker quote, and the booking total all call into here
 * so the price the renter sees always equals the price they pay.
 */

/** Parse an unknown value (DB jsonb / form) into a clean, sorted PriceTier[]. */
export function normalizeTiers(raw: unknown): PriceTier[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const tiers: PriceTier[] = [];
  for (const t of arr) {
    if (!t || typeof t !== "object") continue;
    const o = t as Record<string, unknown>;
    const min = Number(o.min);
    const perDay = Number(o.per_day);
    const maxRaw = o.max;
    const max = maxRaw == null || maxRaw === "" ? null : Number(maxRaw);
    if (!Number.isFinite(min) || min < 1) continue;
    if (!Number.isFinite(perDay) || perDay <= 0) continue;
    if (max != null && (!Number.isFinite(max) || max < min)) continue;
    tiers.push({ min, max, per_day: Math.round(perDay) });
  }
  tiers.sort((a, b) => a.min - b.min);
  return tiers;
}

/** Find the tier covering `nights`; beyond the defined ranges, the last (open) tier applies. */
export function tierForNights(tiers: PriceTier[], nights: number): PriceTier | null {
  if (!tiers.length || nights <= 0) return null;
  for (const t of tiers) {
    if (nights >= t.min && (t.max == null || nights <= t.max)) return t;
  }
  return tiers[tiers.length - 1] ?? null;
}

/** Price for a booking of `nights` nights. Falls back to flat per-day when no tiers. */
export function priceForNights(
  tiers: PriceTier[] | null | undefined,
  fallbackPerDay: number,
  nights: number,
): { perDay: number; total: number } {
  if (nights <= 0) return { perDay: fallbackPerDay, total: 0 };
  const list = tiers && tiers.length ? tiers : null;
  const t = list ? tierForNights(list, nights) : null;
  const perDay = t ? t.per_day : fallbackPerDay;
  return { perDay, total: perDay * nights };
}

/** Lowest per-day rate — used for the "เริ่มต้น ฿X/วัน" card/detail label and the price filter. */
export function startingPerDay(
  tiers: PriceTier[] | null | undefined,
  fallbackPerDay: number,
): number {
  if (tiers && tiers.length) return Math.min(...tiers.map((t) => t.per_day));
  return fallbackPerDay;
}

/** True when the dress has more than one effective rate (so UI can show "หลายช่วงราคา"). */
export function hasMultipleRates(tiers: PriceTier[] | null | undefined): boolean {
  if (!tiers || tiers.length < 2) return false;
  return new Set(tiers.map((t) => t.per_day)).size > 1;
}

/**
 * Validate a tier set for the seller form:
 *  - at least one tier, first starts at day 1
 *  - contiguous (each min = previous max + 1), exactly one open-ended tier at the end
 *  - per_day > 0
 *  - per-day is non-increasing as days grow (a longer tier never costs MORE per
 *    day). A lower TOTAL for more days is allowed — that's the long-rental discount.
 */
export function validateTiers(tiers: PriceTier[]): { ok: boolean; error?: string } {
  if (!tiers.length) return { ok: false, error: "ต้องมีอย่างน้อย 1 ช่วงราคา" };
  if (tiers[0].min !== 1) return { ok: false, error: "ช่วงแรกต้องเริ่มที่ 1 วัน" };

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (t.per_day <= 0) return { ok: false, error: "ราคาต่อวันต้องมากกว่า 0" };
    const isLast = i === tiers.length - 1;
    if (!isLast && t.max == null) return { ok: false, error: "มีได้แค่ช่วงเปิดท้ายเดียว (X วันขึ้นไป)" };
    if (isLast && t.max != null) return { ok: false, error: "ช่วงสุดท้ายต้องเป็นแบบเปิดท้าย (X วันขึ้นไป)" };
    if (!isLast) {
      const next = tiers[i + 1];
      if (t.max == null || next.min !== t.max + 1) {
        return { ok: false, error: "ช่วงวันต้องต่อเนื่องกัน ไม่มีวันขาดหาย" };
      }
      if (next.per_day > t.per_day) {
        return {
          ok: false,
          error: `ช่วง ${next.min} วันขึ้นไป ราคาต่อวัน (฿${next.per_day.toLocaleString()}) แพงกว่าช่วงสั้นกว่า — เช่านานควรถูกกว่าหรือเท่ากัน`,
        };
      }
    }
  }
  return { ok: true };
}
