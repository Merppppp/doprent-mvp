import type { AdsTier } from "./types";

/**
 * Seller plan limits + labels. Single source for quota enforcement (server)
 * and quota display (dashboard).
 *
 * Tiers map to the marketing names: free = Free, boost = Mid, featured = High.
 */

/** Max number of dress listings a plan may have. `null` = unlimited. */
export const TIER_DRESS_LIMIT: Record<AdsTier, number | null> = {
  free: 10,
  boost: 30,
  featured: null,
  full: null, // MVP default — unlimited
};

export const TIER_LABEL: Record<AdsTier, string> = {
  free: "Free",
  boost: "Boost",
  featured: "Featured",
  full: "Full Plan",
};

/** Dress limit for a tier, defaulting to the Free limit when tier is missing/unknown. */
export function dressLimitFor(tier: AdsTier | null | undefined): number | null {
  if (!tier) return TIER_DRESS_LIMIT.free;
  return tier in TIER_DRESS_LIMIT ? TIER_DRESS_LIMIT[tier] : TIER_DRESS_LIMIT.free;
}
