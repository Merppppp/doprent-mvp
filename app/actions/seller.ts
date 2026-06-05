"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidLineContact, normalizeLineUrl } from "@/lib/line";
import { dressLimitFor } from "@/lib/tiers";
import { normalizeTiers, validateTiers } from "@/lib/pricing";
import type { AdsTier, Color, PriceTier } from "@/lib/types";

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function dressSlug(name: string): string {
  const base = slugify(name);
  return base ? `${base}-${Date.now().toString(36).slice(-5)}` : `d-${Date.now().toString(36)}`;
}

export async function createBoutique(formData: FormData): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const name = String(formData.get("name") ?? "").trim();
  const areaLabel = String(formData.get("area_label") ?? "").trim();
  const areaKeyRaw = String(formData.get("area_key") ?? "").trim() || null;
  const lineUrlRaw = String(formData.get("line_url") ?? "").trim();
  const lineUrl = normalizeLineUrl(lineUrlRaw);
  const instagram = String(formData.get("instagram") ?? "").trim() || null;
  const tag = String(formData.get("tag") ?? "").trim() || null;
  const story = String(formData.get("story") ?? "").trim() || null;
  const deliveryInfo = String(formData.get("delivery_info") ?? "").trim() || null;
  const houseNo = String(formData.get("house_no") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim() || null;
  const subdistrict = String(formData.get("subdistrict") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const province = String(formData.get("province") ?? "กรุงเทพมหานคร").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim() || null;
  const sinceYearRaw = String(formData.get("since_year") ?? "").trim();
  const sinceYear = sinceYearRaw ? parseInt(sinceYearRaw, 10) : null;
  const coverColor = (String(formData.get("cover_color") ?? "rose") as Color);
  const ownerName = String(formData.get("owner_name") ?? "").trim() || null;

  const address = [houseNo, street, subdistrict ? `แขวง${subdistrict}` : null, district ? `เขต${district}` : null, province, postalCode]
    .filter(Boolean).join(" ") || null;

  if (!name) return { ok: false, error: "กรุณาใส่ชื่อร้าน" };
  if (!houseNo) return { ok: false, error: "กรุณาใส่บ้านเลขที่" };
  if (!district) return { ok: false, error: "กรุณาเลือกเขต" };
  if (!subdistrict) return { ok: false, error: "กรุณาเลือกแขวง" };
  if (!areaLabel) return { ok: false, error: "ที่อยู่ไม่ถูกต้อง" };
  if (!isValidLineContact(lineUrlRaw)) return { ok: false, error: "ลิงก์ LINE ไม่ถูกต้อง" };
  if (sinceYear !== null && (isNaN(sinceYear) || sinceYear < 1980 || sinceYear > new Date().getFullYear())) {
    return { ok: false, error: "ปีที่เปิดบริการไม่ถูกต้อง" };
  }

  // Validate area_key FK
  let areaKey: string | null = null;
  if (areaKeyRaw) {
    const areaExists = await db.area.findUnique({ where: { key: areaKeyRaw } });
    areaKey = areaExists ? areaKeyRaw : null;
  }

  // Unique slug
  let slug = slugify(name) || `r-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const exists = await db.boutique.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${slugify(name)}-${i + 2}`;
  }

  const created = await db.boutique.create({
    data: {
      slug, name, ownerId: user.id, ownerName, areaKey, areaLabel,
      address, houseNo, street, subdistrict, district, province, postalCode,
      lineUrl, instagram, tag, story, sinceYear, coverColor, deliveryInfo,
      status: "pending", kycStatus: "none",
    },
    select: { slug: true },
  });

  // Bump role to seller (never downgrade admin)
  if (user.role !== "admin") {
    await db.user.update({ where: { id: user.id }, data: { role: "seller" } });
  }

  revalidatePath("/", "layout");
  return { ok: true, slug: created.slug };
}

export async function updateBoutique(boutiqueId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const boutique = await db.boutique.findUnique({ where: { id: boutiqueId }, select: { ownerId: true } });
  if (!boutique || boutique.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขร้านนี้" };

  const updates: Record<string, unknown> = {};
  const fields = ["name","area_label","area_key","instagram","tag","story","delivery_info","owner_name","address","hours","cover_color","promptpay_id"] as const;
  for (const f of fields) {
    const v = formData.get(f);
    if (v !== null) {
      const camel = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      updates[camel] = String(v).trim() || null;
    }
  }
  const lineRaw = formData.get("line_url");
  if (lineRaw !== null) {
    const s = String(lineRaw).trim();
    if (s) {
      if (!isValidLineContact(s)) return { ok: false, error: "ลิงก์ LINE ไม่ถูกต้อง" };
      updates.lineUrl = normalizeLineUrl(s);
    }
  }
  const sinceYearRaw = String(formData.get("since_year") ?? "").trim();
  if (sinceYearRaw) {
    const y = parseInt(sinceYearRaw, 10);
    if (!isNaN(y) && y >= 1980 && y <= new Date().getFullYear()) updates.sinceYear = y;
  }

  await db.boutique.update({ where: { id: boutiqueId }, data: updates });
  revalidatePath("/sell/dashboard");
  return { ok: true };
}

export async function submitKyc(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const boutiqueId = String(formData.get("boutique_id") ?? "").trim();
  if (!boutiqueId) return { ok: false, error: "ไม่พบร้าน" };

  const boutique = await db.boutique.findUnique({ where: { id: boutiqueId }, select: { ownerId: true, kycStatus: true } });
  if (!boutique || boutique.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์ส่ง KYC ของร้านนี้" };

  const businessType = String(formData.get("business_type") ?? "").trim();
  if (!["individual", "company"].includes(businessType)) return { ok: false, error: "กรุณาเลือกประเภทธุรกิจ" };

  const legalName = String(formData.get("legal_name") ?? "").trim();
  const taxId = String(formData.get("tax_id") ?? "").trim();
  if (!legalName) return { ok: false, error: "กรุณาใส่ชื่อตามบัตรประชาชน/นิติบุคคล" };
  if (!taxId) return { ok: false, error: "กรุณาใส่เลขประจำตัวผู้เสียภาษี/บัตรประชาชน" };
  if (!/^[0-9]{13}$/.test(taxId)) return { ok: false, error: "เลขประจำตัวผู้เสียภาษี/บัตรประชาชนต้องเป็นตัวเลข 13 หลัก" };

  const plan = String(formData.get("plan") ?? "Free").trim();

  await db.kycSubmission.create({
    data: {
      boutiqueId, ownerId: user.id,
      businessType: businessType as "individual" | "company",
      legalName, taxId,
      dbdRegNo: String(formData.get("dbd_reg_no") ?? "").trim() || null,
      idCardUrl: String(formData.get("id_card_url") ?? "").trim() || null,
      dbdDocUrl: String(formData.get("dbd_doc_url") ?? "").trim() || null,
      plan: (["Free", "Boost", "Featured"].includes(plan) ? plan : "Free") as "Free" | "Boost" | "Featured",
      status: "pending",
    },
  });
  await db.boutique.update({ where: { id: boutiqueId }, data: { kycStatus: "submitted" } });

  revalidatePath("/sell/dashboard");
  revalidatePath("/admin/kyc");
  return { ok: true };
}

export async function redirectAfterSignup(slug: string): Promise<never> {
  redirect(`/sell/kyc?slug=${encodeURIComponent(slug)}`);
}

export async function createDress(formData: FormData): Promise<{ ok: boolean; error?: string; slug?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const boutiqueId = String(formData.get("boutique_id") ?? "").trim();
  if (!boutiqueId) return { ok: false, error: "ไม่พบร้าน" };

  const boutique = await db.boutique.findUnique({
    where: { id: boutiqueId },
    select: { ownerId: true, name: true, lineUrl: true, kycStatus: true, adsTier: true },
  });
  if (!boutique || boutique.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์เพิ่มชุดในร้านนี้" };
  if (boutique.kycStatus === "none" || boutique.kycStatus === "rejected") {
    return { ok: false, error: "ต้องส่งเอกสาร KYC ก่อนถึงจะเพิ่มชุดได้" };
  }

  // Enforce per-plan listing quota.
  const limit = dressLimitFor(boutique.adsTier as AdsTier);
  if (limit != null) {
    const count = await db.dress.count({ where: { boutiqueId } });
    if (count >= limit) {
      return {
        ok: false,
        error: `แพ็กเกจปัจจุบันลงชุดได้สูงสุด ${limit} ตัว — อัปเกรดแพ็กเกจเพื่อลงเพิ่ม`,
      };
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "กรุณาใส่ชื่อชุด" };

  const pricePerDay = parseInt(String(formData.get("price_per_day") ?? "0"), 10);
  const tiers = normalizeTiers(String(formData.get("price_tiers") ?? ""));
  if (tiers.length) {
    const v = validateTiers(tiers);
    if (!v.ok) return { ok: false, error: v.error ?? "ราคาตามช่วงไม่ถูกต้อง" };
  } else if (pricePerDay < 100) {
    return { ok: false, error: "ราคาเช่าต่อวันต้องอย่างน้อย ฿100" };
  }

  const lineUrlRaw = String(formData.get("line_url") ?? "").trim();
  const lineUrl = lineUrlRaw ? normalizeLineUrl(lineUrlRaw) : boutique.lineUrl;

  const imagesRaw = String(formData.get("images") ?? "").trim();
  const images = imagesRaw ? imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean) : [];
  const occasions = formData.getAll("occasions").map(String).filter(Boolean);

  const tagCode = `DR${String(Date.now()).slice(-4).padStart(4, "0")}`;

  const created = await db.dress.create({
    data: {
      slug: dressSlug(name),
      tagCode,
      name,
      designer: String(formData.get("designer") ?? "").trim() || null,
      boutiqueId,
      boutiqueName: boutique.name,
      size: String(formData.get("size") ?? "M") as "XS"|"S"|"M"|"L"|"XL",
      color: String(formData.get("color") ?? "rose") as Color,
      pricePerDay,
      priceTiers: tiers.length ? tiers : null,
      deposit: parseInt(String(formData.get("deposit") ?? "0"), 10) || 0,
      description: String(formData.get("description") ?? "").trim() || null,
      images,
      occasions,
      lineUrl,
      status: "pending",
      available: true,
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/sell/dashboard");
  revalidatePath("/admin/dresses");
  return { ok: true, slug: created.slug, id: created.id };
}

export async function updateDress(dressId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const dress = await db.dress.findUnique({
    where: { id: dressId },
    include: { boutique: { select: { ownerId: true } } },
  });
  if (!dress || dress.boutique.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขชุดนี้" };

  const updates: Record<string, unknown> = {};
  for (const f of ["name","designer","size","color","description"] as const) {
    const v = formData.get(f);
    if (v !== null) updates[f] = String(v).trim() || null;
  }
  const lineRaw = formData.get("line_url");
  if (lineRaw !== null) {
    const s = String(lineRaw).trim();
    if (s) {
      if (!isValidLineContact(s)) return { ok: false, error: "ลิงก์ LINE ไม่ถูกต้อง" };
      updates.lineUrl = normalizeLineUrl(s);
    }
  }
  const ppd = formData.get("price_per_day");
  if (ppd !== null) { const p = parseInt(String(ppd), 10); if (!isNaN(p) && p > 0) updates.pricePerDay = p; }
  const tiersRaw = formData.get("price_tiers");
  if (typeof tiersRaw === "string") {
    const updTiers = normalizeTiers(tiersRaw);
    if (updTiers.length) {
      const v = validateTiers(updTiers);
      if (!v.ok) return { ok: false, error: v.error ?? "ราคาตามช่วงไม่ถูกต้อง" };
      updates.priceTiers = updTiers;
    } else {
      updates.priceTiers = null;
    }
  }
  const dep = formData.get("deposit");
  if (dep !== null) { const p = parseInt(String(dep), 10); if (!isNaN(p)) updates.deposit = p; }
  const imagesRaw = formData.get("images");
  if (imagesRaw !== null) updates.images = String(imagesRaw).split("\n").map((s) => s.trim()).filter(Boolean);
  const occs = formData.getAll("occasions").map(String).filter(Boolean);
  if (occs.length > 0) updates.occasions = occs;
  const avail = formData.get("available");
  if (avail !== null) updates.available = avail === "true" || avail === "on";

  await db.dress.update({ where: { id: dressId }, data: updates });
  revalidatePath("/sell/dashboard");
  revalidatePath(`/dress/${dressId}`);
  return { ok: true };
}

export async function updateDressPriceTiers(dressId: string, tiers: PriceTier[]): Promise<{ ok: boolean; error?: string }> {
  if (!Array.isArray(tiers)) return { ok: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" };
  for (const t of tiers) {
    if (!Number.isInteger(t.days) || t.days <= 0) return { ok: false, error: "จำนวนวันต้องเป็นจำนวนเต็มที่มากกว่า 0" };
    if (!Number.isInteger(t.price) || t.price <= 0) return { ok: false, error: "ราคาต้องเป็นจำนวนเต็มที่มากกว่า 0" };
  }
  const days = tiers.map((t) => t.days);
  if (new Set(days).size !== days.length) return { ok: false, error: "จำนวนวันต้องไม่ซ้ำกัน" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const dress = await db.dress.findUnique({
    where: { id: dressId },
    include: { boutique: { select: { ownerId: true } } },
  });
  if (!dress || dress.boutique.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขชุดนี้" };

  await db.dress.update({ where: { id: dressId }, data: { priceTiers: tiers } });
  revalidatePath("/sell/dashboard");
  revalidatePath(`/dress/${dressId}`);
  return { ok: true };
}

export async function toggleDressAvailable(dressId: string, available: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const dress = await db.dress.findUnique({
    where: { id: dressId },
    include: { boutique: { select: { ownerId: true } } },
  });
  if (!dress || dress.boutique.ownerId !== user.id) return { ok: false };

  await db.dress.update({ where: { id: dressId }, data: { available } });
  revalidatePath("/sell/dashboard");
  return { ok: true };
}
