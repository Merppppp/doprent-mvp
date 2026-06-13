/**
 * Shop promo-banner eligibility tiers.
 *
 * Plain module (NOT "use server") so these non-async exports can be shared by
 * both the server-action file and client/server components. A "use server"
 * file may only export async functions, so constants/types must live here.
 */

/**
 * Minimum adsTier required to create shop promo banners.
 * 'free' tier cannot create banners; 'boost' and 'featured' can.
 */
export const BANNER_ELIGIBLE_TIERS = ["boost", "featured"] as const;
export type BannerEligibleTier = (typeof BANNER_ELIGIBLE_TIERS)[number];
