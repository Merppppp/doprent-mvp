"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidLineContact, normalizeLineUrl } from "@/lib/line";
import { dressLimitFor } from "@/lib/tiers";
import type { AdsTier, Color } from "@/lib/types";

/** Convert a Thai/English name to a URL slug. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * Create a new boutique owned by the current user. Marks status='pending'
 * (admin must approve before it shows publicly) and bumps profile.role='seller'.
 */
export async function createBoutique(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  slug?: string;
}> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const name = String(formData.get("name") ?? "").trim();
  const areaLabel = String(formData.get("area_label") ?? "").trim();
  const areaKey = String(formData.get("area_key") ?? "").trim() || null;
  const lineUrlRaw = String(formData.get("line_url") ?? "").trim();
  const lineUrl = normalizeLineUrl(lineUrlRaw);
  const instagram = String(formData.get("instagram") ?? "").trim() || null;
  const tag = String(formData.get("tag") ?? "").trim() || null;
  const story = String(formData.get("story") ?? "").trim() || null;

  // Structured Thai address
  const houseNo = String(formData.get("house_no") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim() || null;
  const subdistrict = String(formData.get("subdistrict") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const province = String(formData.get("province") ?? "กรุงเทพมหานคร").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim() || null;

  // Compose denormalized one-line address for display
  const address = [
    houseNo,
    street,
    subdistrict ? `แขวง${subdistrict}` : null,
    district ? `เขต${district}` : null,
    province,
    postalCode,
  ]
    .filter(Boolean)
    .join(" ") || null;
  const sinceYearRaw = String(formData.get("since_year") ?? "").trim();
  const sinceYear = sinceYearRaw ? parseInt(sinceYearRaw, 10) : null;
  const coverColor = (String(formData.get("cover_color") ?? "rose") as Color) || "rose";
  const ownerName = String(formData.get("owner_name") ?? "").trim() || null;

  if (!name) return { ok: false, error: "กรุณาใส่ชื่อร้าน" };
  if (!houseNo) return { ok: false, error: "กรุณาใส่บ้านเลขที่" };
  if (!district) return { ok: false, error: "กรุณาเลือกเขต" };
  if (!subdistrict) return { ok: false, error: "กรุณาเลือกแขวง" };
  if (!areaLabel) return { ok: false, error: "ที่อยู่ไม่ถูกต้อง" };
  if (!isValidLineContact(lineUrlRaw)) {
    return {
      ok: false,
      error: "ลิงก์ LINE ไม่ถูกต้อง: ใส่ @ชื่อ, ชื่อ, หรือลิงก์เต็มจาก LINE",
    };
  }
  if (
    sinceYear !== null &&
    (isNaN(sinceYear) || sinceYear < 1980 || sinceYear > new Date().getFullYear())
  ) {
    return { ok: false, error: "ปีที่เปิดบริการไม่ถูกต้อง" };
  }

  // Generate unique slug
  let slug = slugify(name);
  if (!slug) slug = `r-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await sb
      .from("boutiques")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${slugify(name)}-${i + 2}`;
  }

  // Insert boutique
  const { data: created, error: insertErr } = await sb
    .from("boutiques")
    .insert({
      slug,
      name,
      owner_id: user.id,
      owner_name: ownerName,
      area_key: areaKey,
      area_label: areaLabel,
      address,
      house_no: houseNo,
      street,
      subdistrict,
      district,
      province,
      postal_code: postalCode,
      line_url: lineUrl,
      instagram,
      tag,
      story,
      since_year: sinceYear,
      cover_color: coverColor,
      status: "pending", // admin must approve
      kyc_status: "none",
    })
    .select("slug")
    .maybeSingle();

  if (insertErr || !created) {
    return { ok: false, error: insertErr?.message ?? "สร้างร้านไม่สำเร็จ" };
  }

  // Bump profile role to 'seller' (but NEVER downgrade admin → seller)
  const { data: existingProfile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (existingProfile?.role !== "admin") {
    await sb
      .from("profiles")
      .update({ role: "seller", updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  return { ok: true, slug: created.slug };
}

/** Update an existing boutique owned by the current user. */
export async function updateBoutique(
  boutiqueId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  // Verify ownership
  const { data: b } = await sb
    .from("boutiques")
    .select("id, owner_id")
    .eq("id", boutiqueId)
    .maybeSingle();
  if (!b || b.owner_id !== user.id) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ไขร้านนี้" };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const fields = [
    "name",
    "area_label",
    "area_key",
    "instagram",
    "tag",
    "story",
    "owner_name",
    "address",
    "hours",
    "cover_color",
    "promptpay_id",
  ];
  for (const f of fields) {
    const v = formData.get(f);
    if (v !== null) {
      const s = String(v).trim();
      updates[f] = s || null;
    }
  }
  // line_url has special normalization
  const lineRaw = formData.get("line_url");
  if (lineRaw !== null) {
    const s = String(lineRaw).trim();
    if (s) {
      if (!isValidLineContact(s)) return { ok: false, error: "ลิงก์ LINE ไม่ถูกต้อง" };
      updates.line_url = normalizeLineUrl(s);
    }
  }
  const sinceYearRaw = String(formData.get("since_year") ?? "").trim();
  if (sinceYearRaw) {
    const y = parseInt(sinceYearRaw, 10);
    if (!isNaN(y) && y >= 1980 && y <= new Date().getFullYear()) {
      updates.since_year = y;
    }
  }

  const { error: updErr } = await sb.from("boutiques").update(updates).eq("id", boutiqueId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/sell/dashboard");
  revalidatePath(`/boutique/${b.id}`);
  return { ok: true };
}

/** Submit KYC documents. Files are pre-uploaded to Supabase Storage by the client. */
export async function submitKyc(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const boutiqueId = String(formData.get("boutique_id") ?? "").trim();
  if (!boutiqueId) return { ok: false, error: "ไม่พบร้าน" };

  // Verify ownership
  const { data: b } = await sb
    .from("boutiques")
    .select("id, owner_id, kyc_status")
    .eq("id", boutiqueId)
    .maybeSingle();
  if (!b || b.owner_id !== user.id) {
    return { ok: false, error: "ไม่มีสิทธิ์ส่ง KYC ของร้านนี้" };
  }

  const businessType = String(formData.get("business_type") ?? "").trim();
  if (!["individual", "company"].includes(businessType)) {
    return { ok: false, error: "กรุณาเลือกประเภทธุรกิจ" };
  }
  const legalName = String(formData.get("legal_name") ?? "").trim();
  const taxId = String(formData.get("tax_id") ?? "").trim();
  const dbdRegNo = String(formData.get("dbd_reg_no") ?? "").trim() || null;
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const bankAccNo = String(formData.get("bank_acc_no") ?? "").trim();
  const bankAccName = String(formData.get("bank_acc_name") ?? "").trim();
  const idCardUrl = String(formData.get("id_card_url") ?? "").trim() || null;
  const dbdDocUrl = String(formData.get("dbd_doc_url") ?? "").trim() || null;
  const bookBankUrl = String(formData.get("book_bank_url") ?? "").trim() || null;
  const plan = String(formData.get("plan") ?? "Free").trim();

  if (!legalName) return { ok: false, error: "กรุณาใส่ชื่อตามบัตรประชาชน/นิติบุคคล" };
  if (!taxId) return { ok: false, error: "กรุณาใส่เลขประจำตัวผู้เสียภาษี/บัตรประชาชน" };
  if (!bankName || !bankAccNo || !bankAccName)
    return { ok: false, error: "กรุณาใส่ข้อมูลบัญชีธนาคารให้ครบ" };

  const { error: insertErr } = await sb.from("kyc_submissions").insert({
    boutique_id: boutiqueId,
    owner_id: user.id,
    business_type: businessType as "individual" | "company",
    legal_name: legalName,
    tax_id: taxId,
    dbd_reg_no: dbdRegNo,
    bank_name: bankName,
    bank_acc_no: bankAccNo,
    bank_acc_name: bankAccName,
    id_card_url: idCardUrl,
    dbd_doc_url: dbdDocUrl,
    book_bank_url: bookBankUrl,
    plan: ["Free", "Boost", "Featured"].includes(plan) ? plan : "Free",
    status: "pending",
  });

  if (insertErr) return { ok: false, error: insertErr.message };

  // Flip boutique kyc_status to 'submitted'
  await sb
    .from("boutiques")
    .update({ kyc_status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", boutiqueId);

  revalidatePath("/sell/dashboard");
  revalidatePath("/admin/kyc");
  return { ok: true };
}

/** Helper redirect after successful boutique create */
export async function redirectAfterSignup(slug: string): Promise<never> {
  redirect(`/sell/kyc?slug=${encodeURIComponent(slug)}`);
}

/** Slugify with timestamp fallback (used by createDress). */
function dressSlug(name: string): string {
  const base = slugify(name);
  return base ? `${base}-${Date.now().toString(36).slice(-5)}` : `d-${Date.now().toString(36)}`;
}

/** Create a new dress listing in the seller's boutique. Starts as 'pending' for admin review. */
export async function createDress(formData: FormData): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const boutiqueId = String(formData.get("boutique_id") ?? "").trim();
  if (!boutiqueId) return { ok: false, error: "ไม่พบร้าน" };
  const { data: b } = await sb
    .from("boutiques")
    .select("id, owner_id, name, line_url, kyc_status, ads_tier")
    .eq("id", boutiqueId)
    .maybeSingle();
  if (!b || b.owner_id !== user.id) return { ok: false, error: "ไม่มีสิทธิ์เพิ่มชุดในร้านนี้" };
  if (b.kyc_status === "none" || b.kyc_status === "rejected") {
    return { ok: false, error: "ต้องส่งเอกสาร KYC ก่อนถึงจะเพิ่มชุดได้" };
  }

  // Enforce per-plan listing quota.
  const limit = dressLimitFor((b as { ads_tier?: AdsTier }).ads_tier);
  if (limit != null) {
    const { count } = await sb
      .from("dresses")
      .select("id", { count: "exact", head: true })
      .eq("boutique_id", boutiqueId);
    if ((count ?? 0) >= limit) {
      return {
        ok: false,
        error: `แพ็กเกจปัจจุบันลงชุดได้สูงสุด ${limit} ตัว — อัปเกรดแพ็กเกจเพื่อลงเพิ่ม`,
      };
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "กรุณาใส่ชื่อชุด" };
  const designer = String(formData.get("designer") ?? "").trim() || null;
  const size = String(formData.get("size") ?? "M").trim();
  const color = String(formData.get("color") ?? "rose").trim();
  const pricePerDay = parseInt(String(formData.get("price_per_day") ?? "0"), 10);
  const deposit = parseInt(String(formData.get("deposit") ?? "0"), 10);
  const description = String(formData.get("description") ?? "").trim() || null;
  const lineUrlRawDress = String(formData.get("line_url") ?? "").trim();
  const lineUrl = lineUrlRawDress ? normalizeLineUrl(lineUrlRawDress) : b.line_url;
  const imagesRaw = String(formData.get("images") ?? "").trim();
  const images: string[] = imagesRaw ? imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean) : [];
  const occasionsRaw = formData.getAll("occasions").map((v) => String(v)).filter(Boolean);

  if (pricePerDay < 100) return { ok: false, error: "ราคาเช่าต่อวันต้องอย่างน้อย ฿100" };

  const { data: created, error: insertErr } = await sb
    .from("dresses")
    .insert({
      slug: dressSlug(name),
      name,
      designer,
      boutique_id: boutiqueId,
      boutique_name: b.name,
      size,
      color,
      price_per_day: pricePerDay,
      deposit: isNaN(deposit) ? 0 : deposit,
      description,
      images,
      occasions: occasionsRaw,
      line_url: lineUrl,
      status: "pending",
      available: true,
    })
    .select("slug")
    .maybeSingle();

  if (insertErr) return { ok: false, error: insertErr.message };

  revalidatePath("/sell/dashboard");
  revalidatePath("/admin/dresses");
  return { ok: true, slug: created?.slug };
}

/** Update a dress (seller can edit own). */
export async function updateDress(
  dressId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  // Verify ownership via boutique
  const { data: dress } = await sb
    .from("dresses")
    .select("id, boutique_id, boutiques!inner(owner_id)")
    .eq("id", dressId)
    .maybeSingle();
  const ownerId = (dress as unknown as { boutiques: { owner_id: string } } | null)?.boutiques?.owner_id;
  if (!dress || ownerId !== user.id) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ไขชุดนี้" };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const fields = ["name", "designer", "size", "color", "description"];
  for (const f of fields) {
    const v = formData.get(f);
    if (v !== null) updates[f] = String(v).trim() || null;
  }
  // line_url normalized
  const lineRaw = formData.get("line_url");
  if (lineRaw !== null) {
    const s = String(lineRaw).trim();
    if (s) {
      if (!isValidLineContact(s)) return { ok: false, error: "ลิงก์ LINE ไม่ถูกต้อง" };
      updates.line_url = normalizeLineUrl(s);
    }
  }
  const ppd = formData.get("price_per_day");
  if (ppd !== null) {
    const p = parseInt(String(ppd), 10);
    if (!isNaN(p) && p > 0) updates.price_per_day = p;
  }
  const dep = formData.get("deposit");
  if (dep !== null) {
    const p = parseInt(String(dep), 10);
    if (!isNaN(p)) updates.deposit = p;
  }
  const imagesRaw = formData.get("images");
  if (imagesRaw !== null) {
    updates.images = String(imagesRaw)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const occs = formData.getAll("occasions").map((v) => String(v)).filter(Boolean);
  if (occs.length > 0) updates.occasions = occs;
  const avail = formData.get("available");
  if (avail !== null) updates.available = avail === "true" || avail === "on";

  const { error: updErr } = await sb.from("dresses").update(updates).eq("id", dressId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/sell/dashboard");
  revalidatePath(`/dress/${dress.id}`);
  return { ok: true };
}

/** Toggle dress availability (seller can pause listings). */
export async function toggleDressAvailable(dressId: string, available: boolean): Promise<{ ok: boolean }> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false };
  const { data: dress } = await sb
    .from("dresses")
    .select("id, boutiques!inner(owner_id)")
    .eq("id", dressId)
    .maybeSingle();
  const ownerId = (dress as unknown as { boutiques: { owner_id: string } } | null)?.boutiques?.owner_id;
  if (!dress || ownerId !== user.id) return { ok: false };
  await sb.from("dresses").update({ available, updated_at: new Date().toISOString() }).eq("id", dressId);
  revalidatePath("/sell/dashboard");
  return { ok: true };
}
