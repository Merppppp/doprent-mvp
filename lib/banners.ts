import { db } from "@/lib/db";

/** Shape returned by getActiveBanners — minimal carousel-ready data. */
export type ActiveBanner = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
};

/**
 * Returns banners that are active, approved, and within their schedule window,
 * ordered by sort_order ascending.
 *
 * - Admin/global banners (shopId null): default status='approved' — visible as before.
 * - Shop promo banners (shopId not null): ONLY shown when status='approved'
 *   (seller creates with status='pending'; admin approves to make visible).
 */
export async function getActiveBanners(): Promise<ActiveBanner[]> {
  const now = new Date();
  try {
    return await db.banner.findMany({
      where: {
        isActive: true,
        status: "approved",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        sortOrder: true,
      },
    });
  } catch (e) {
    // Degrade gracefully — if DB is unavailable, fall back to shop banners.
    console.error("[banners] getActiveBanners failed", e);
    return [];
  }
}
