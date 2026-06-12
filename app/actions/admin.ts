"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { base, db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
import { dueAt } from "@/lib/bookings";

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (user.role !== "admin") return { ok: false, error: "ต้องเป็น admin" };
  return { ok: true, userId: user.id };
}

/**
 * Write a business audit row to audit_logs (DESIGN §6.1).
 * Uses `base` (un-extended) to avoid re-auditing the audit write itself.
 */
async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  reason: string | null,
  payload?: Record<string, unknown>,
) {
  try {
    await base.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: targetType,
        entityId: targetId,
        actorId: adminId,
        before: Prisma.JsonNull,
        after: {
          admin_action: action,
          reason: reason ?? null,
          ...payload,
        },
      },
    });
  } catch (e) {
    console.error("[admin audit] write failed", action, e);
  }
}

export async function approveKyc(kycId: string, notes?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const kyc = await db.kycSubmission.findUnique({ where: { id: kycId } });
  if (!kyc) return { ok: false, error: "ไม่พบ KYC" };

  const isPaidPlan = kyc.plan === "boost" || kyc.plan === "featured";

  return withActor(auth.userId, async () => {
    await db.kycSubmission.update({
      where: { id: kycId },
      data: { status: "approved", reviewerId: auth.userId, reviewNotes: notes ?? null, reviewedAt: new Date() },
    });
    await db.shop.update({
      where: { id: kyc.shopId },
      data: { kycStatus: "verified", verified: isPaidPlan, status: "live" },
    });
    await logAdminAction(auth.userId, "approve_kyc", "kyc", kycId, notes ?? null, { plan: kyc.plan, verified: isPaidPlan });

    revalidatePath("/admin");
    revalidatePath("/admin/kyc");
    revalidatePath("/admin/shops");
    revalidatePath("/sell/dashboard");
    return { ok: true };
  });
}

export async function rejectKyc(kycId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!reason.trim()) return { ok: false, error: "ระบุเหตุผลด้วย" };

  const kyc = await db.kycSubmission.findUnique({ where: { id: kycId } });
  if (!kyc) return { ok: false, error: "ไม่พบ KYC" };

  return withActor(auth.userId, async () => {
    await db.kycSubmission.update({
      where: { id: kycId },
      data: { status: "rejected", reviewerId: auth.userId, reviewNotes: reason, reviewedAt: new Date() },
    });
    await db.shop.update({ where: { id: kyc.shopId }, data: { kycStatus: "rejected" } });
    await logAdminAction(auth.userId, "reject_kyc", "kyc", kycId, reason);

    revalidatePath("/admin/kyc");
    revalidatePath("/sell/dashboard");
    return { ok: true };
  });
}

export async function setShopStatus(
  shopId: string,
  status: "live" | "pending" | "rejected",
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  return withActor(auth.userId, async () => {
    await db.shop.update({
      where: { id: shopId },
      data: { status, rejectReason: status === "rejected" ? reason ?? null : null },
    });
    await logAdminAction(auth.userId, `set_shop_${status}`, "shop", shopId, reason ?? null);

    revalidatePath("/admin/shops");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function toggleShopVerified(shopId: string, verified: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  return withActor(auth.userId, async () => {
    await db.shop.update({ where: { id: shopId }, data: { verified } });
    await logAdminAction(auth.userId, verified ? "verify_shop" : "unverify_shop", "shop", shopId, null);

    revalidatePath("/admin/shops");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function toggleShopFeatured(shopId: string, featured: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  return withActor(auth.userId, async () => {
    await db.shop.update({ where: { id: shopId }, data: { featured } });
    await logAdminAction(auth.userId, featured ? "feature_shop" : "unfeature_shop", "shop", shopId, null);

    revalidatePath("/admin/shops");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function setProductStatus(
  productId: string,
  status: "live" | "pending" | "rejected",
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  return withActor(auth.userId, async () => {
    await db.product.update({
      where: { id: productId },
      data: { status, rejectReason: status === "rejected" ? reason ?? null : null },
    });
    await logAdminAction(auth.userId, `set_product_${status}`, "product", productId, reason ?? null);

    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true };
  });
}

export async function toggleProductFeatured(productId: string, featured: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  return withActor(auth.userId, async () => {
    await db.product.update({ where: { id: productId }, data: { featured } });
    await logAdminAction(auth.userId, featured ? "feature_product" : "unfeature_product", "product", productId, null);

    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true };
  });
}

/* --------------------------- booking resolution --------------------------- */
/* Admin resolves the two dead-end statuses (cancel_requested, slip_disputed). */

function revalidateBookingPaths(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
}

export async function adminApproveCancel(bookingId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, cancelReason: true, cancelFromStatus: true },
  });
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.status !== "cancel_requested")
    return { ok: false, error: "การจองนี้ไม่ได้อยู่ในสถานะรอยกเลิก" };

  return withActor(auth.userId, async () => {
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: "cancel_requested" },
      data: { status: "cancelled" },
    });
    if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

    await logAdminAction(auth.userId, "approve_booking_cancel", "booking", bookingId, note ?? null, {
      sellerReason: booking.cancelReason,
      fromStatus: booking.cancelFromStatus,
      refundRequired: booking.cancelFromStatus === "confirmed",
    });
    revalidateBookingPaths(bookingId);
    return { ok: true };
  });
}

export async function adminDenyCancel(bookingId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, cancelReason: true, cancelFromStatus: true },
  });
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.status !== "cancel_requested")
    return { ok: false, error: "การจองนี้ไม่ได้อยู่ในสถานะรอยกเลิก" };

  const revertTo =
    booking.cancelFromStatus === "payment_review" || booking.cancelFromStatus === "confirmed"
      ? (booking.cancelFromStatus as "payment_review" | "confirmed")
      : "confirmed";

  return withActor(auth.userId, async () => {
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: "cancel_requested" },
      data: { status: revertTo, cancelReason: null, cancelFromStatus: null },
    });
    if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

    await logAdminAction(auth.userId, "deny_booking_cancel", "booking", bookingId, note ?? null, {
      sellerReason: booking.cancelReason,
      revertedTo: revertTo,
    });
    revalidateBookingPaths(bookingId);
    return { ok: true };
  });
}

export async function adminAcceptSlip(bookingId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  return withActor(auth.userId, async () => {
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: "slip_disputed" },
      data: { status: "confirmed", cancelReason: null, cancelFromStatus: null },
    });
    if (res.count === 0) return { ok: false, error: "การจองนี้ไม่ได้อยู่ในสถานะสลิปมีปัญหา" };

    await logAdminAction(auth.userId, "accept_disputed_slip", "booking", bookingId, note ?? null);
    revalidateBookingPaths(bookingId);
    return { ok: true };
  });
}

export async function adminRejectSlip(bookingId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, slipPath: true },
  });
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.status !== "slip_disputed")
    return { ok: false, error: "การจองนี้ไม่ได้อยู่ในสถานะสลิปมีปัญหา" };

  return withActor(auth.userId, async () => {
    const res = await db.booking.updateMany({
      where: { id: bookingId, status: "slip_disputed" },
      data: {
        status: "waiting_for_payment",
        currentDueAt: new Date(dueAt()),
        cancelReason: null,
        cancelFromStatus: null,
      },
    });
    if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

    await logAdminAction(auth.userId, "reject_disputed_slip", "booking", bookingId, note ?? null, {
      rejectedSlipPath: booking.slipPath,
    });
    revalidateBookingPaths(bookingId);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Legacy aliases — keep old names working during transition
// ---------------------------------------------------------------------------
/** @deprecated use setShopStatus */
export const setBoutiqueStatus = setShopStatus;
/** @deprecated use toggleShopVerified */
export const toggleBoutiqueVerified = toggleShopVerified;
/** @deprecated use toggleShopFeatured */
export const toggleBoutiqueFeatured = toggleShopFeatured;
/** @deprecated use setProductStatus */
export const setDressStatus = setProductStatus;
/** @deprecated use toggleProductFeatured */
export const toggleDressFeatured = toggleProductFeatured;
