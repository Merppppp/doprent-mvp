"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
import { recomputeShopRating } from "@/lib/reviews";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function hideReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireAdmin();
  if (!user) return { ok: false, error: "ไม่มีสิทธิ์ admin" };

  const review = await db.review.findUnique({ where: { id: reviewId }, select: { shopId: true } });
  if (!review) return { ok: false, error: "ไม่พบรีวิว" };

  return withActor(user.id, async () => {
    await db.$transaction(async (tx) => {
      await tx.review.update({ where: { id: reviewId }, data: { status: "hidden" } });
      await recomputeShopRating(tx, review.shopId);
    });
    revalidatePath("/admin/reviews");
    const shop = await db.shop.findUnique({ where: { id: review.shopId }, select: { slug: true } });
    if (shop) revalidatePath(`/shop/${shop.slug}`);
    return { ok: true };
  });
}

export async function unhideReview(reviewId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireAdmin();
  if (!user) return { ok: false, error: "ไม่มีสิทธิ์ admin" };

  const review = await db.review.findUnique({ where: { id: reviewId }, select: { shopId: true } });
  if (!review) return { ok: false, error: "ไม่พบรีวิว" };

  return withActor(user.id, async () => {
    await db.$transaction(async (tx) => {
      await tx.review.update({ where: { id: reviewId }, data: { status: "visible" } });
      await recomputeShopRating(tx, review.shopId);
    });
    revalidatePath("/admin/reviews");
    const shop = await db.shop.findUnique({ where: { id: review.shopId }, select: { slug: true } });
    if (shop) revalidatePath(`/shop/${shop.slug}`);
    return { ok: true };
  });
}
