"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
import { REVIEWABLE_STATUSES, EDIT_WINDOW_DAYS, recomputeShopRating } from "@/lib/reviews";

function validateRating(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function validateComment(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().slice(0, 1000);
  return s || null;
}

export async function createReview(
  bookingId: string,
  rating: unknown,
  comment: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      renterId: true,
      shopId: true,
      status: true,
      review: { select: { id: true } },
    },
  });
  if (!booking) return { ok: false, error: "ไม่พบการจองนี้" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์รีวิวการจองนี้" };
  if (!(REVIEWABLE_STATUSES as readonly string[]).includes(booking.status)) {
    return { ok: false, error: "รีวิวได้หลังจบการเช่าแล้วเท่านั้น" };
  }
  if (booking.review) return { ok: false, error: "รีวิวการจองนี้แล้ว" };

  const ratingVal = validateRating(rating);
  if (!ratingVal) return { ok: false, error: "คะแนนต้องอยู่ระหว่าง 1–5" };
  const commentVal = validateComment(comment);

  const shopId = booking.shopId;

  return withActor(user.id, async () => {
    await db.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          reviewerId: user.id,
          shopId,
          bookingId,
          rating: ratingVal,
          comment: commentVal,
          status: "visible",
        },
      });
      await recomputeShopRating(tx, shopId);
    });

    revalidatePath("/account/bookings");
    revalidatePath(`/account/bookings/${bookingId}`);
    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
    if (shop) revalidatePath(`/shop/${shop.slug}`);

    return { ok: true };
  });
}

export async function editReview(
  reviewId: string,
  rating: unknown,
  comment: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { reviewerId: true, shopId: true, createdAt: true, sellerRepliedAt: true, bookingId: true },
  });
  if (!review || review.reviewerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขรีวิวนี้" };
  if (review.sellerRepliedAt) return { ok: false, error: "ไม่สามารถแก้ไขรีวิวที่ร้านตอบกลับแล้ว" };

  const daysSince = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > EDIT_WINDOW_DAYS) return { ok: false, error: `แก้ไขรีวิวได้ภายใน ${EDIT_WINDOW_DAYS} วันเท่านั้น` };

  const ratingVal = validateRating(rating);
  if (!ratingVal) return { ok: false, error: "คะแนนต้องอยู่ระหว่าง 1–5" };
  const commentVal = validateComment(comment);

  const { shopId } = review;

  return withActor(user.id, async () => {
    await db.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: { rating: ratingVal, comment: commentVal },
      });
      await recomputeShopRating(tx, shopId);
    });

    revalidatePath("/account/bookings");
    if (review.bookingId) revalidatePath(`/account/bookings/${review.bookingId}`);
    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
    if (shop) revalidatePath(`/shop/${shop.slug}`);

    return { ok: true };
  });
}

export async function deleteReview(
  reviewId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { reviewerId: true, shopId: true, createdAt: true, sellerRepliedAt: true, bookingId: true },
  });
  if (!review || review.reviewerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์ลบรีวิวนี้" };
  if (review.sellerRepliedAt) return { ok: false, error: "ไม่สามารถลบรีวิวที่ร้านตอบกลับแล้ว" };

  const daysSince = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > EDIT_WINDOW_DAYS) return { ok: false, error: `ลบรีวิวได้ภายใน ${EDIT_WINDOW_DAYS} วันเท่านั้น` };

  const { shopId } = review;

  return withActor(user.id, async () => {
    await db.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });
      await recomputeShopRating(tx, shopId);
    });

    revalidatePath("/account/bookings");
    if (review.bookingId) revalidatePath(`/account/bookings/${review.bookingId}`);
    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
    if (shop) revalidatePath(`/shop/${shop.slug}`);

    return { ok: true };
  });
}
