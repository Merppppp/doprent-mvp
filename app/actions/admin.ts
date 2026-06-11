"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dueAt } from "@/lib/bookings";

async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (user.role !== "admin") return { ok: false, error: "ต้องเป็น admin" };
  return { ok: true, userId: user.id };
}

async function writeAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  reason: string | null,
  payload?: Record<string, unknown>,
) {
  await db.adminAudit.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      reason,
      payload: payload as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function approveKyc(kycId: string, notes?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const kyc = await db.kycSubmission.findUnique({ where: { id: kycId } });
  if (!kyc) return { ok: false, error: "ไม่พบ KYC" };

  const isPaidPlan = kyc.plan === "Boost" || kyc.plan === "Featured";

  await db.kycSubmission.update({
    where: { id: kycId },
    data: { status: "approved", reviewerId: auth.userId, reviewNotes: notes ?? null, reviewedAt: new Date() },
  });
  await db.boutique.update({
    where: { id: kyc.boutiqueId },
    data: { kycStatus: "verified", verified: isPaidPlan, status: "live" },
  });
  await writeAudit(auth.userId, "approve_kyc", "kyc", kycId, notes ?? null, { plan: kyc.plan, verified: isPaidPlan });

  revalidatePath("/admin");
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/boutiques");
  revalidatePath("/sell/dashboard");
  return { ok: true };
}

export async function rejectKyc(kycId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!reason.trim()) return { ok: false, error: "ระบุเหตุผลด้วย" };

  const kyc = await db.kycSubmission.findUnique({ where: { id: kycId } });
  if (!kyc) return { ok: false, error: "ไม่พบ KYC" };

  await db.kycSubmission.update({
    where: { id: kycId },
    data: { status: "rejected", reviewerId: auth.userId, reviewNotes: reason, reviewedAt: new Date() },
  });
  await db.boutique.update({ where: { id: kyc.boutiqueId }, data: { kycStatus: "rejected" } });
  await writeAudit(auth.userId, "reject_kyc", "kyc", kycId, reason);

  revalidatePath("/admin/kyc");
  revalidatePath("/sell/dashboard");
  return { ok: true };
}

export async function setBoutiqueStatus(
  boutiqueId: string,
  status: "live" | "pending" | "rejected",
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  await db.boutique.update({
    where: { id: boutiqueId },
    data: { status, rejectReason: status === "rejected" ? reason ?? null : null },
  });
  await writeAudit(auth.userId, `set_boutique_${status}`, "boutique", boutiqueId, reason ?? null);

  revalidatePath("/admin/boutiques");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleBoutiqueVerified(boutiqueId: string, verified: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  await db.boutique.update({ where: { id: boutiqueId }, data: { verified } });
  await writeAudit(auth.userId, verified ? "verify_boutique" : "unverify_boutique", "boutique", boutiqueId, null);

  revalidatePath("/admin/boutiques");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleBoutiqueFeatured(boutiqueId: string, featured: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  await db.boutique.update({ where: { id: boutiqueId }, data: { featured } });
  await writeAudit(auth.userId, featured ? "feature_boutique" : "unfeature_boutique", "boutique", boutiqueId, null);

  revalidatePath("/admin/boutiques");
  revalidatePath("/");
  return { ok: true };
}

export async function setDressStatus(
  dressId: string,
  status: "live" | "pending" | "rejected",
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  await db.dress.update({
    where: { id: dressId },
    data: { status, rejectReason: status === "rejected" ? reason ?? null : null },
  });
  await writeAudit(auth.userId, `set_dress_${status}`, "dress", dressId, reason ?? null);

  revalidatePath("/admin/dresses");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleDressFeatured(dressId: string, featured: boolean): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  await db.dress.update({ where: { id: dressId }, data: { featured } });
  await writeAudit(auth.userId, featured ? "feature_dress" : "unfeature_dress", "dress", dressId, null);

  revalidatePath("/admin/dresses");
  revalidatePath("/");
  return { ok: true };
}

/* --------------------------- booking resolution --------------------------- */
/* Admin resolves the two dead-end statuses (cancel_requested, slip_disputed).
 * Same atomic updateMany status-guard pattern as app/actions/bookings.ts:
 * the WHERE clause pins the expected source status so concurrent moves lose. */

function revalidateBookingPaths(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
}

/** cancel_requested → cancelled (admin approves the seller's cancel request).
 *  NOTE on refunds: if the renter already paid (request raised from
 *  payment_review/confirmed), the refund is handled MANUALLY off-platform —
 *  admin coordinates a PromptPay transfer back to the renter. There is no
 *  automated refund in the MVP; the audit row is the paper trail. */
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

  const res = await db.booking.updateMany({
    where: { id: bookingId, status: "cancel_requested" },
    data: { status: "cancelled" },
  });
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  await writeAudit(auth.userId, "approve_booking_cancel", "booking", bookingId, note ?? null, {
    sellerReason: booking.cancelReason,
    fromStatus: booking.cancelFromStatus,
    refundRequired: booking.cancelFromStatus === "confirmed",
  });
  revalidateBookingPaths(bookingId);
  return { ok: true };
}

/** cancel_requested → previous active status (admin denies the cancel request).
 *  Reverts to cancel_from_status when it is a known active state; falls back
 *  to confirmed when the origin is unknown (safest for the renter, who has
 *  already paid in every flow that can reach cancel_requested). */
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

  const res = await db.booking.updateMany({
    where: { id: bookingId, status: "cancel_requested" },
    data: { status: revertTo, cancelReason: null, cancelFromStatus: null },
  });
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  await writeAudit(auth.userId, "deny_booking_cancel", "booking", bookingId, note ?? null, {
    sellerReason: booking.cancelReason,
    revertedTo: revertTo,
  });
  revalidateBookingPaths(bookingId);
  return { ok: true };
}

/** slip_disputed → confirmed (admin checked the slip and it is valid). */
export async function adminAcceptSlip(bookingId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const res = await db.booking.updateMany({
    where: { id: bookingId, status: "slip_disputed" },
    data: { status: "confirmed", cancelReason: null, cancelFromStatus: null },
  });
  if (res.count === 0) return { ok: false, error: "การจองนี้ไม่ได้อยู่ในสถานะสลิปมีปัญหา" };

  await writeAudit(auth.userId, "accept_disputed_slip", "booking", bookingId, note ?? null);
  revalidateBookingPaths(bookingId);
  return { ok: true };
}

/** slip_disputed → waiting_for_payment with a fresh payment window:
 *  the slip really was invalid, so the renter must pay/re-upload again. */
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

  const res = await db.booking.updateMany({
    where: { id: bookingId, status: "slip_disputed" },
    data: {
      status: "waiting_for_payment",
      currentDueAt: new Date(dueAt()),
      // Old slip key stays in R2 for the audit trail; uploading a new slip
      // overwrites slipPath with a fresh key.
      cancelReason: null,
      cancelFromStatus: null,
    },
  });
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  await writeAudit(auth.userId, "reject_disputed_slip", "booking", bookingId, note ?? null, {
    rejectedSlipPath: booking.slipPath,
  });
  revalidateBookingPaths(bookingId);
  return { ok: true };
}
