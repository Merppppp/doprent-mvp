"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
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

function productSlug(name: string): string {
  const base = slugify(name);
  return base ? `${base}-${Date.now().toString(36).slice(-5)}` : `d-${Date.now().toString(36)}`;
}

export async function createShop(formData: FormData): Promise<{ ok: boolean; error?: string; slug?: string }> {
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

  // Resolve area_key → areaId (UUID FK)
  let areaId: string | null = null;
  if (areaKeyRaw) {
    const area = await db.area.findUnique({ where: { key: areaKeyRaw }, select: { id: true } });
    areaId = area?.id ?? null;
  }

  // Unique slug
  let slug = slugify(name) || `r-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const exists = await db.shop.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${slugify(name)}-${i + 2}`;
  }

  return withActor(user.id, async () => {
    const created = await db.shop.create({
      data: {
        slug, name, ownerId: user.id, ownerName, areaId, areaLabel,
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
  });
}

export async function updateShop(shopId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { ownerId: true } });
  if (!shop || shop.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขร้านนี้" };

  const updates: Record<string, unknown> = {};
  // area_key handled separately (UUID FK resolution); exclude from generic camelCase loop
  const scalarFields = ["name","area_label","instagram","tag","story","delivery_info","owner_name","address","hours","cover_color","promptpay_id"] as const;
  for (const f of scalarFields) {
    const v = formData.get(f);
    if (v !== null) {
      const camel = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      updates[camel] = String(v).trim() || null;
    }
  }
  // Resolve area_key → areaId
  const areaKeyRaw = formData.get("area_key");
  if (areaKeyRaw !== null) {
    const k = String(areaKeyRaw).trim();
    if (k) {
      const area = await db.area.findUnique({ where: { key: k }, select: { id: true } });
      if (area) updates.areaId = area.id;
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

  return withActor(user.id, async () => {
    await db.shop.update({ where: { id: shopId }, data: updates });
    revalidatePath("/sell/dashboard");
    return { ok: true };
  });
}

export async function submitKyc(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const shopId = String(formData.get("boutique_id") ?? "").trim();
  if (!shopId) return { ok: false, error: "ไม่พบร้าน" };

  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { ownerId: true, kycStatus: true } });
  if (!shop || shop.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์ส่ง KYC ของร้านนี้" };

  const businessType = String(formData.get("business_type") ?? "").trim();
  if (!["individual", "company"].includes(businessType)) return { ok: false, error: "กรุณาเลือกประเภทธุรกิจ" };

  const legalName = String(formData.get("legal_name") ?? "").trim();
  const taxId = String(formData.get("tax_id") ?? "").trim();
  if (!legalName) return { ok: false, error: "กรุณาใส่ชื่อตามบัตรประชาชน/นิติบุคคล" };
  if (!taxId) return { ok: false, error: "กรุณาใส่เลขประจำตัวผู้เสียภาษี/บัตรประชาชน" };
  if (!/^[0-9]{13}$/.test(taxId)) return { ok: false, error: "เลขประจำตัวผู้เสียภาษี/บัตรประชาชนต้องเป็นตัวเลข 13 หลัก" };

  // Plan: lowercase (new PlanTier enum: free | boost | featured)
  const planRaw = String(formData.get("plan") ?? "free").trim().toLowerCase();
  const plan = (["free", "boost", "featured"].includes(planRaw) ? planRaw : "free") as "free" | "boost" | "featured";

  return withActor(user.id, async () => {
    await db.kycSubmission.create({
      data: {
        shopId, ownerId: user.id,
        businessType: businessType as "individual" | "company",
        legalName, taxId,
        dbdRegNo: String(formData.get("dbd_reg_no") ?? "").trim() || null,
        idCardUrl: String(formData.get("id_card_url") ?? "").trim() || null,
        dbdDocUrl: String(formData.get("dbd_doc_url") ?? "").trim() || null,
        plan,
        status: "pending",
      },
    });
    await db.shop.update({ where: { id: shopId }, data: { kycStatus: "submitted" } });

    revalidatePath("/sell/dashboard");
    revalidatePath("/admin/kyc");
    return { ok: true };
  });
}

export async function redirectAfterSignup(slug: string): Promise<never> {
  redirect(`/sell/kyc?slug=${encodeURIComponent(slug)}`);
}

export async function createProduct(formData: FormData): Promise<{ ok: boolean; error?: string; slug?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const shopId = String(formData.get("boutique_id") ?? "").trim();
  if (!shopId) return { ok: false, error: "ไม่พบร้าน" };

  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: { ownerId: true, name: true, lineUrl: true, kycStatus: true, adsTier: true },
  });
  if (!shop || shop.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์เพิ่มสินค้าในร้านนี้" };
  if (shop.kycStatus === "none" || shop.kycStatus === "rejected") {
    return { ok: false, error: "ต้องส่งเอกสาร KYC ก่อนถึงจะเพิ่มสินค้าได้" };
  }

  // Enforce per-plan listing quota.
  const limit = dressLimitFor(shop.adsTier as AdsTier);
  if (limit != null) {
    const count = await db.product.count({ where: { shopId } });
    if (count >= limit) {
      return {
        ok: false,
        error: `แพ็กเกจปัจจุบันลงสินค้าได้สูงสุด ${limit} ชิ้น — อัปเกรดแพ็กเกจเพื่อลงเพิ่ม`,
      };
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "กรุณาใส่ชื่อสินค้า" };

  const pricePerDay = parseInt(String(formData.get("price_per_day") ?? "0"), 10);
  const tiersRaw = normalizeTiers(String(formData.get("price_tiers") ?? ""));
  let tiers: PriceTier[] = [];
  if (tiersRaw.length) {
    const v = validateTiers(tiersRaw);
    if (!v.ok) return { ok: false, error: v.error ?? "ราคาตามช่วงไม่ถูกต้อง" };
    tiers = tiersRaw;
  } else if (pricePerDay < 100) {
    return { ok: false, error: "ราคาเช่าต่อวันต้องอย่างน้อย ฿100" };
  }
  // base price = lowest tier rate (or flat pricePerDay)
  const basePerDay = tiers.length ? Math.min(...tiers.map((t) => t.per_day)) : pricePerDay;

  const lineUrlRaw = String(formData.get("line_url") ?? "").trim();
  const lineUrl = lineUrlRaw ? normalizeLineUrl(lineUrlRaw) : shop.lineUrl;

  const imagesRaw = String(formData.get("images") ?? "").trim();
  const images = imagesRaw ? imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean) : [];

  // Resolve occasion keys → tag IDs (reject unknown/inactive)
  const occasionKeys = formData.getAll("occasions").map(String).filter(Boolean);
  let tagIds: string[] = [];
  if (occasionKeys.length > 0) {
    const tags = await db.tag.findMany({
      where: { key: { in: occasionKeys }, tagGroup: { key: "occasion" }, isActive: true },
      select: { id: true },
    });
    tagIds = tags.map((t) => t.id);
  }

  // Resolve productTypeId (seller UI is dress-only today)
  const productType = await db.productType.findUnique({ where: { key: "dress" }, select: { id: true } });
  if (!productType) return { ok: false, error: "product type ไม่พบ — กรุณาแจ้ง admin" };

  const tagCode = `DR${String(Date.now()).slice(-4).padStart(4, "0")}`;

  return withActor(user.id, async () => {
    const created = await db.product.create({
      data: {
        slug: productSlug(name),
        tagCode,
        name,
        designer: String(formData.get("designer") ?? "").trim() || null,
        shopId,
        productTypeId: productType.id,
        size: String(formData.get("size") ?? "M") as "XS"|"S"|"M"|"L"|"XL",
        color: String(formData.get("color") ?? "rose") as Color,
        pricePerDay: basePerDay,
        deposit: parseInt(String(formData.get("deposit") ?? "0"), 10) || 0,
        description: String(formData.get("description") ?? "").trim() || null,
        lineUrl,
        status: "pending",
        available: true,
        images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
        priceTiers: tiers.length
          ? { create: tiers.map((t) => ({ minDays: t.min, pricePerDay: t.per_day })) }
          : { create: [{ minDays: 1, pricePerDay: basePerDay }] },
        ...(tagIds.length > 0 ? { productTags: { create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
      select: { id: true, slug: true },
    });

    revalidatePath("/sell/dashboard");
    revalidatePath("/admin/products");
    return { ok: true, slug: created.slug, id: created.id };
  });
}

export async function updateProduct(productId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { shop: { select: { ownerId: true } } },
  });
  if (!product || product.shop.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขสินค้านี้" };

  const scalarUpdates: Record<string, unknown> = {};
  for (const f of ["name","designer","size","color","description"] as const) {
    const v = formData.get(f);
    if (v !== null) scalarUpdates[f] = String(v).trim() || null;
  }
  const lineRaw = formData.get("line_url");
  if (lineRaw !== null) {
    const s = String(lineRaw).trim();
    if (s) {
      if (!isValidLineContact(s)) return { ok: false, error: "ลิงก์ LINE ไม่ถูกต้อง" };
      scalarUpdates.lineUrl = normalizeLineUrl(s);
    }
  }
  const ppd = formData.get("price_per_day");
  if (ppd !== null) { const p = parseInt(String(ppd), 10); if (!isNaN(p) && p > 0) scalarUpdates.pricePerDay = p; }
  const dep = formData.get("deposit");
  if (dep !== null) { const p = parseInt(String(dep), 10); if (!isNaN(p)) scalarUpdates.deposit = p; }
  const avail = formData.get("available");
  if (avail !== null) scalarUpdates.available = avail === "true" || avail === "on";

  // Parse price tiers (child table replace)
  let newTiers: PriceTier[] | null = null;
  const tiersRaw = formData.get("price_tiers");
  if (typeof tiersRaw === "string") {
    const parsed = normalizeTiers(tiersRaw);
    if (parsed.length) {
      const v = validateTiers(parsed);
      if (!v.ok) return { ok: false, error: v.error ?? "ราคาตามช่วงไม่ถูกต้อง" };
      newTiers = parsed;
      // Update base price to lowest tier rate
      scalarUpdates.pricePerDay = Math.min(...parsed.map((t) => t.per_day));
    }
  }

  // Parse images (child table replace)
  let newImages: string[] | null = null;
  const imagesRaw = formData.get("images");
  if (imagesRaw !== null) {
    newImages = String(imagesRaw).split("\n").map((s) => s.trim()).filter(Boolean);
  }

  // Parse occasions → resolve tag IDs (child table replace)
  let newTagIds: string[] | null = null;
  const occKeys = formData.getAll("occasions").map(String).filter(Boolean);
  if (occKeys.length > 0) {
    const tags = await db.tag.findMany({
      where: { key: { in: occKeys }, tagGroup: { key: "occasion" }, isActive: true },
      select: { id: true },
    });
    newTagIds = tags.map((t) => t.id);
  } else if (formData.has("occasions")) {
    // occasions sent but empty → clear
    newTagIds = [];
  }

  return withActor(user.id, async () => {
    if (Object.keys(scalarUpdates).length > 0) {
      await db.product.update({ where: { id: productId }, data: scalarUpdates });
    }
    // Replace images if provided
    if (newImages !== null) {
      await db.productImage.deleteMany({ where: { productId } });
      if (newImages.length > 0) {
        await db.productImage.createMany({
          data: newImages.map((url, i) => ({ productId, url, sortOrder: i })),
        });
      }
    }
    // Replace price tiers if provided
    if (newTiers !== null) {
      await db.productPriceTier.deleteMany({ where: { productId } });
      await db.productPriceTier.createMany({
        data: newTiers.map((t) => ({ productId, minDays: t.min, pricePerDay: t.per_day })),
      });
    }
    // Replace occasions/tags if provided
    if (newTagIds !== null) {
      await db.productTag.deleteMany({ where: { productId } });
      if (newTagIds.length > 0) {
        await db.productTag.createMany({
          data: newTagIds.map((tagId) => ({ productId, tagId })),
          skipDuplicates: true,
        });
      }
    }

    revalidatePath("/sell/dashboard");
    revalidatePath(`/dress/${productId}`);
    return { ok: true };
  });
}

export async function updateProductPriceTiers(productId: string, tiers: PriceTier[]): Promise<{ ok: boolean; error?: string }> {
  if (!Array.isArray(tiers)) return { ok: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" };
  for (const t of tiers) {
    if (!Number.isInteger(t.min) || t.min <= 0) return { ok: false, error: "จำนวนวันต้องเป็นจำนวนเต็มที่มากกว่า 0" };
    if (!Number.isInteger(t.per_day) || t.per_day <= 0) return { ok: false, error: "ราคาต้องเป็นจำนวนเต็มที่มากกว่า 0" };
  }
  const mins = tiers.map((t) => t.min);
  if (new Set(mins).size !== mins.length) return { ok: false, error: "จำนวนวันต้องไม่ซ้ำกัน" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { shop: { select: { ownerId: true } } },
  });
  if (!product || product.shop.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขสินค้านี้" };

  return withActor(user.id, async () => {
    await db.productPriceTier.deleteMany({ where: { productId } });
    await db.productPriceTier.createMany({
      data: tiers.map((t) => ({ productId, minDays: t.min, pricePerDay: t.per_day })),
    });
    revalidatePath("/sell/dashboard");
    revalidatePath(`/dress/${productId}`);
    return { ok: true };
  });
}

export async function toggleProductAvailable(productId: string, available: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { shop: { select: { ownerId: true } } },
  });
  if (!product || product.shop.ownerId !== user.id) return { ok: false };

  return withActor(user.id, async () => {
    await db.product.update({ where: { id: productId }, data: { available } });
    revalidatePath("/sell/dashboard");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Legacy aliases (called by SignupForm / KycWizard which still use old names
// during the 4B→4C migration window)
// ---------------------------------------------------------------------------
/** @deprecated use createShop */
export const createBoutique = createShop;
/** @deprecated use updateShop */
export const updateBoutique = updateShop;
/** @deprecated use createProduct */
export const createDress = createProduct;
/** @deprecated use updateProduct */
export const updateDress = updateProduct;
/** @deprecated use updateProductPriceTiers */
export const updateDressPriceTiers = updateProductPriceTiers;
/** @deprecated use toggleProductAvailable */
export const toggleDressAvailable = toggleProductAvailable;
