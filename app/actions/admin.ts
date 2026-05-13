"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { ok: false, error: "ต้องเป็น admin" };
  return { ok: true, userId: user.id };
}

async function writeAudit(action: string, targetType: string, targetId: string | null, reason: string | null, payload: Record<string, unknown> | null = null) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("admin_audit").insert({
    admin_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId,
    reason,
    payload,
  });
}

/** Approve a KYC submission: marks kyc verified + auto-flips boutiques.verified=true */
export async function approveKyc(kycId: string, notes?: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const sb = createClient();
  const { data: kyc } = await sb.from("kyc_submissions").select("id, boutique_id").eq("id", kycId).maybeSingle();
  if (!kyc) return { ok: false, error: "ไม่พบ KYC" };

  await sb
    .from("kyc_submissions")
    .update({
      status: "approved",
      reviewer_id: auth.userId,
      review_notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", kycId);

  await sb
    .from("boutiques")
    .update({ kyc_status: "verified", verified: true, status: "live", updated_at: new Date().toISOString() })
    .eq("id", kyc.boutique_id);

  await writeAudit("approve_kyc", "kyc", kycId, notes ?? null);
  revalidatePath("/admin");
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/boutiques");
  revalidatePath("/sell/dashboard");
  return { ok: true };
}

/** Reject a KYC submission with a reason */
export async function rejectKyc(kycId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!reason.trim()) return { ok: false, error: "ระบุเหตุผลด้วย" };
  const sb = createClient();
  const { data: kyc } = await sb.from("kyc_submissions").select("id, boutique_id").eq("id", kycId).maybeSingle();
  if (!kyc) return { ok: false, error: "ไม่พบ KYC" };

  await sb
    .from("kyc_submissions")
    .update({
      status: "rejected",
      reviewer_id: auth.userId,
      review_notes: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", kycId);

  await sb
    .from("boutiques")
    .update({ kyc_status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", kyc.boutique_id);

  await writeAudit("reject_kyc", "kyc", kycId, reason);
  revalidatePath("/admin/kyc");
  revalidatePath("/sell/dashboard");
  return { ok: true };
}

/** Set boutique status pending → live or rejected */
export async function setBoutiqueStatus(
  boutiqueId: string,
  status: "live" | "pending" | "rejected",
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const sb = createClient();
  await sb
    .from("boutiques")
    .update({
      status,
      reject_reason: status === "rejected" ? reason ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", boutiqueId);
  await writeAudit(`set_boutique_${status}`, "boutique", boutiqueId, reason ?? null);
  revalidatePath("/admin/boutiques");
  revalidatePath("/");
  return { ok: true };
}

/** Toggle boutique verified flag */
export async function toggleBoutiqueVerified(
  boutiqueId: string,
  verified: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const sb = createClient();
  await sb
    .from("boutiques")
    .update({ verified, updated_at: new Date().toISOString() })
    .eq("id", boutiqueId);
  await writeAudit(verified ? "verify_boutique" : "unverify_boutique", "boutique", boutiqueId, null);
  revalidatePath("/admin/boutiques");
  revalidatePath("/");
  return { ok: true };
}

/** Toggle featured flag */
export async function toggleBoutiqueFeatured(
  boutiqueId: string,
  featured: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const sb = createClient();
  await sb
    .from("boutiques")
    .update({ featured, updated_at: new Date().toISOString() })
    .eq("id", boutiqueId);
  await writeAudit(featured ? "feature_boutique" : "unfeature_boutique", "boutique", boutiqueId, null);
  revalidatePath("/admin/boutiques");
  revalidatePath("/");
  return { ok: true };
}

/** Set dress status (pending → live or rejected) */
export async function setDressStatus(
  dressId: string,
  status: "live" | "pending" | "rejected",
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const sb = createClient();
  await sb
    .from("dresses")
    .update({
      status,
      reject_reason: status === "rejected" ? reason ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dressId);
  await writeAudit(`set_dress_${status}`, "dress", dressId, reason ?? null);
  revalidatePath("/admin/dresses");
  revalidatePath("/browse");
  return { ok: true };
}

/** Toggle dress featured flag */
export async function toggleDressFeatured(
  dressId: string,
  featured: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const sb = createClient();
  await sb
    .from("dresses")
    .update({ featured, updated_at: new Date().toISOString() })
    .eq("id", dressId);
  await writeAudit(featured ? "feature_dress" : "unfeature_dress", "dress", dressId, null);
  revalidatePath("/admin/dresses");
  revalidatePath("/");
  return { ok: true };
}
