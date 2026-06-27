import { db } from "@/lib/db";

/** Active tag groups — for the tag-request group dropdown */
export async function listTagGroups() {
  return db.tagGroup.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, key: true, label: true },
  });
}

/** A shop's own tag requests (all statuses, newest first) — for the seller inline panel */
export async function listTagRequestsForShop(shopId: string) {
  return db.tagRequest.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestedLabel: true,
      requestedKey: true,
      status: true,
      reviewNotes: true,
      reviewedAt: true,
      createdAt: true,
      tagGroup: { select: { label: true, key: true } },
    },
  });
}

/** All pending tag requests ordered oldest-first (for admin queue) */
export async function listPendingTagRequests() {
  return db.tagRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      requestedLabel: true,
      requestedKey: true,
      status: true,
      createdAt: true,
      tagGroup: { select: { id: true, label: true, key: true } },
      shop: { select: { id: true, name: true, slug: true } },
    },
  });
}

/** Recently reviewed tag requests (approved/rejected, last 50) */
export async function listReviewedTagRequests(skip = 0, take = 20) {
  const [rows, total] = await Promise.all([
    db.tagRequest.findMany({
      where: { status: { in: ["approved", "rejected"] } },
      orderBy: { reviewedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        requestedLabel: true,
        requestedKey: true,
        status: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        tagGroup: { select: { id: true, label: true, key: true } },
        shop: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.tagRequest.count({ where: { status: { in: ["approved", "rejected"] } } }),
  ]);
  return { rows, total };
}
