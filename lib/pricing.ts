import type { PriceTier } from "./types";

/**
 * Calculate total rental price given price tiers and number of days.
 *
 * Picks the largest tier whose `days` does not exceed `rentalDays`,
 * then multiplies its daily rate by `rentalDays`.
 * Falls back to the smallest tier if rentalDays < all tier thresholds.
 *
 * Example tiers: [{days:1, price:1000}, {days:3, price:2100}, {days:7, price:4200}]
 *   rentalDays=2  → tier(1d, 1000) → rate 1000/day → total 2000
 *   rentalDays=5  → tier(3d, 2100) → rate 700/day  → total 3500
 *   rentalDays=10 → tier(7d, 4200) → rate 600/day  → total 6000
 */
export function calcRentalPrice(tiers: PriceTier[], rentalDays: number, pricePerDay: number): number {
  if (rentalDays <= 0) return 0;
  if (!tiers.length) return pricePerDay * rentalDays;

  const sorted = [...tiers].sort((a, b) => a.days - b.days);
  const applicable = sorted.filter((t) => t.days <= rentalDays);
  const tier = applicable.length ? applicable[applicable.length - 1] : sorted[0];

  const ratePerDay = tier.price / tier.days;
  return Math.round(ratePerDay * rentalDays);
}

/**
 * Display rate per day for a given rental duration.
 * Useful for showing "฿X/วัน" on browse/detail pages.
 */
export function effectiveDailyRate(tiers: PriceTier[], rentalDays: number, pricePerDay: number): number {
  if (rentalDays <= 0) return 0;
  const total = calcRentalPrice(tiers, rentalDays, pricePerDay);
  return Math.round(total / rentalDays);
}
