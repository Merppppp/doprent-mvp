export const REVIEWABLE_STATUSES = ["returned", "completed"] as const;
export const EDIT_WINDOW_DAYS = 14;

// Minimal interface that covers both plain PrismaClient and audit-extended transaction clients.
type TxClient = {
  $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  shop: {
    update: (args: {
      where: { id: string };
      data: { ratingCount: number; ratingAvg: number | null };
    }) => Promise<unknown>;
  };
};

/** Recompute rating_avg and rating_count on shops from visible reviews.
 *  Must be called inside the same transaction as the create/edit/delete. */
export async function recomputeShopRating(tx: TxClient, shopId: string): Promise<void> {
  type Row = { cnt: bigint | number; avg: string | null };
  const [row] = await tx.$queryRaw<Row[]>`
    SELECT COUNT(*)::int AS cnt, ROUND(AVG(rating)::numeric, 2)::text AS avg
    FROM reviews
    WHERE shop_id = ${shopId}::uuid
      AND status  = 'visible'
  `;
  await tx.shop.update({
    where: { id: shopId },
    data: {
      ratingCount: Number(row?.cnt ?? 0),
      ratingAvg: row?.avg != null ? parseFloat(row.avg) : null,
    },
  });
}

/** Masked reviewer display name — show only first name + last-initial. */
function maskName(fullName: string | null): string {
  if (!fullName) return "ผู้เช่า";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export type PublicReview = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
};

/** Fetch visible reviews for a shop (newest-first). */
export async function getShopReviews(
  shopId: string,
  opts: { take?: number } = {}
): Promise<PublicReview[]> {
  const { db } = await import("@/lib/db");
  const rows = await db.review.findMany({
    where: { shopId, status: "visible" },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 20,
    include: { reviewer: { select: { fullName: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    reviewer_name: maskName(r.reviewer?.fullName ?? null),
    rating: r.rating,
    comment: r.comment,
    seller_reply: r.sellerReply,
    seller_replied_at: r.sellerRepliedAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
  }));
}
