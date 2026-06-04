"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

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
    data: { adminId, action, targetType, targetId, reason, payload },
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
  revalidatePath("/browse");
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
