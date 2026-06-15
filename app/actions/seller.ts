"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
import { isValidLineContact, normalizeLineUrl } from "@/lib/line";
import { dressLimitFor } from "@/lib/tiers";
// normalizeTiers/validateTiers removed — replaced by parsePriceTiersFromForm
import type { AdsTier, Color, PriceTier } from "@/lib/types";
// DB-valid size enum values only (Prisma schema has XS..XL; no new enum values allowed)
type DbSize = "XS" | "S" | "M" | "L" | "XL";
import { resolveTagSelections } from "@/lib/tag-groups";

/** Valid Size enum values in the DB (no enum additions — Postgres 55P04 guard). */
const VALID_SIZES = new Set<string>(["XS", "S", "M", "L", "XL"]);

type VariantInput = {
  size: DbSize;
  quantity: number;
  available: boolean;
  bustCm: number | null;
  waistCm: number | null;
  lengthCm: number | null;
};

/**
 * Parse a `variants` JSON field from a FormData submission.
 * Returns an empty array if the field is absent or malformed.
 * Only rows with a valid Size enum value are included.
 */
function parseVariants(formData: FormData): VariantInput[] {
  const raw = formData.get("variants");
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const parseNullableInt = (v: unknown): number | null => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };
    return (parsed as Array<Record<string, unknown>>)
      .filter((r) => typeof r === "object" && r !== null && VALID_SIZES.has(String(r.size ?? "")))
      .map((r) => ({
        size: String(r.size) as DbSize,
        quantity: Math.max(1, parseInt(String(r.quantity ?? "1"), 10) || 1),
        available: r.available !== false,
        bustCm: parseNullableInt(r.bustCm ?? r.bust_cm),
        waistCm: parseNullableInt(r.waistCm ?? r.waist_cm),
        lengthCm: parseNullableInt(r.lengthCm ?? r.length_cm),
      }));
  } catch {
    return [];
  }
}

type TierInput = { minDays: number; pricePerDay: number };
type SharedTiers = TierInput[];
type PerSizeTiers = { size: DbSize; tiers: TierInput[] }[];

/** Validate a set of tier entries: at least one with minDays=1, all minDays>=1, pricePerDay>=0, unique minDays. */
function validateTierSet(tiers: TierInput[], label?: string): { ok: boolean; error?: string } {
  if (!tiers.length) return { ok: false, error: `${label ? label + ': ' : ''}ต้องมีอย่างน้อย 1 ช่วงราคา` };
  if (!tiers.some((t) => t.minDays === 1)) return { ok: false, error: `${label ? label + ': ' : ''}ต้องมีช่วงเริ่มต้นที่ 1 วัน` };
  for (const t of tiers) {
    if (!Number.isInteger(t.minDays) || t.minDays < 1) return { ok: false, error: `${label ? label + ': ' : ''}จำนวนวันขั้นต่ำต้องเป็นจำนวนเต็ม >= 1` };
    if (!Number.isInteger(t.pricePerDay) || t.pricePerDay < 0) return { ok: false, error: `${label ? label + ': ' : ''}ราคาต้องเป็นจำนวนเต็ม >= 0` };
  }
  const mins = tiers.map((t) => t.minDays);
  if (new Set(mins).size !== mins.length) return { ok: false, error: `${label ? label + ': ' : ''}จำนวนวัน (minDays) ซ้ำกัน` };
  // ราคาเช่าต่อวันต้องอย่างน้อย ฿100 (รักษา behavior เดิม กัน seller ตั้ง ฿0)
  if (Math.min(...tiers.map((t) => t.pricePerDay)) < 100) return { ok: false, error: `${label ? label + ': ' : ''}ราคาเช่าต่อวันต้องอย่างน้อย ฿100` };
  return { ok: true };
}

/** Parse the price_mode + price_tiers fields from form data. Returns null on parse error. */
function parsePriceTiersFromForm(formData: FormData):
  | { mode: "shared"; shared: SharedTiers; deposit: number }
  | { mode: "per_size"; perSize: PerSizeTiers; deposit: number }
  | { ok: false; error: string } {
  const mode = String(formData.get("price_mode") ?? "shared") as "shared" | "per_size";
  const depositRaw = parseInt(String(formData.get("deposit") ?? "0"), 10);
  const deposit = isNaN(depositRaw) || depositRaw < 0 ? 0 : depositRaw;
  const raw = formData.get("price_tiers");
  if (!raw || typeof raw !== "string") return { ok: false, error: "ไม่พบข้อมูลราคา" };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: "ข้อมูลราคาไม่ถูกต้อง" }; }
  if (!Array.isArray(parsed)) return { ok: false, error: "ข้อมูลราคาต้องเป็น array" };

  if (mode === "per_size") {
    const perSize: PerSizeTiers = [];
    for (const item of parsed as Array<Record<string, unknown>>) {
      const size = String(item.size ?? "");
      if (!VALID_SIZES.has(size)) return { ok: false, error: `ไซซ์ไม่ถูกต้อง: ${size}` };
      const ts = item.tiers;
      if (!Array.isArray(ts)) return { ok: false, error: `tiers ของไซซ์ ${size} ต้องเป็น array` };
      const tiers: TierInput[] = ts.map((t: Record<string, unknown>) => ({
        minDays: parseInt(String(t.minDays ?? "0"), 10),
        pricePerDay: parseInt(String(t.pricePerDay ?? "0"), 10),
      }));
      const v = validateTierSet(tiers, `ไซซ์ ${size}`);
      if (!v.ok) return { ok: false, error: v.error! };
      perSize.push({ size: size as DbSize, tiers });
    }
    if (perSize.length === 0) return { ok: false, error: "ต้องมีข้อมูลราคาอย่างน้อย 1 ไซซ์" };
    return { mode: "per_size", perSize, deposit };
  } else {
    const shared: SharedTiers = (parsed as Array<Record<string, unknown>>).map((t) => ({
      minDays: parseInt(String(t.minDays ?? "0"), 10),
      pricePerDay: parseInt(String(t.pricePerDay ?? "0"), 10),
    }));
    const v = validateTierSet(shared);
    if (!v.ok) return { ok: false, error: v.error! };
    return { mode: "shared", shared, deposit };
  }
}

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
  const promptpayId = String(formData.get("promptpay_id") ?? "").trim() || null;
  const bankName = String(formData.get("bank_name") ?? "").trim() || null;
  const bankAccountNumber = String(formData.get("bank_account_number") ?? "").trim() || null;
  const bankAccountName = String(formData.get("bank_account_name") ?? "").trim() || null;

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
        promptpayId, bankName, bankAccountNumber, bankAccountName,
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
  const scalarFields = ["name","area_label","instagram","tag","story","delivery_info","owner_name","address","hours","cover_color","promptpay_id","bank_name","bank_account_number","bank_account_name"] as const;
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

  // Booking policy: integer fields (>= 0; empty / missing = skip)
  for (const f of ["lead_time_days","min_rental_days","return_window_days","buffer_days_after"] as const) {
    const v = formData.get(f);
    if (v !== null) {
      const s = String(v).trim();
      if (s !== "") {
        const n = parseInt(s, 10);
        if (!isNaN(n) && n >= 0) {
          const camel = f.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
          updates[camel] = n;
        }
      }
    }
  }
  // max_rental_days: empty string means null (no limit)
  const maxRentalRaw = formData.get("max_rental_days");
  if (maxRentalRaw !== null) {
    const s = String(maxRentalRaw).trim();
    if (s === "") {
      updates.maxRentalDays = null;
    } else {
      const n = parseInt(s, 10);
      if (!isNaN(n) && n >= 1) updates.maxRentalDays = n;
    }
  }
  // Validate min <= max when both are set
  const minRental = updates.minRentalDays as number | undefined;
  const maxRental = updates.maxRentalDays as number | null | undefined;
  if (typeof minRental === "number" && typeof maxRental === "number" && maxRental < minRental) {
    return { ok: false, error: "จำนวนวันเช่าสูงสุดต้องไม่น้อยกว่าขั้นต่ำ" };
  }

  // closedWeekdays (JSON array of ints 0–6)
  const cwRaw = formData.get("closed_weekdays");
  if (cwRaw !== null) {
    try {
      const parsed: unknown = JSON.parse(String(cwRaw));
      if (
        Array.isArray(parsed) &&
        parsed.every((x) => Number.isInteger(x) && x >= 0 && x <= 6)
      ) {
        updates.closedWeekdays = parsed as number[];
      }
    } catch { /* ignore malformed */ }
  }

  // closedDates (JSON array of {date: YYYY-MM-DD, note?: string})
  let newClosedDates: Array<{ date: string; note?: string }> | null = null;
  const cdRaw = formData.get("closed_dates");
  if (cdRaw !== null) {
    try {
      const parsed: unknown = JSON.parse(String(cdRaw));
      if (Array.isArray(parsed)) {
        newClosedDates = (parsed as Array<Record<string, unknown>>)
          .filter((x) => typeof x?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date as string))
          .map((x) => ({ date: x.date as string, note: typeof x.note === "string" ? x.note : undefined }));
      }
    } catch { /* ignore malformed */ }
  }

  return withActor(user.id, async () => {
    await db.shop.update({ where: { id: shopId }, data: updates });
    // Replace closedDates if provided (delete-all + recreate)
    if (newClosedDates !== null) {
      await db.shopClosedDate.deleteMany({ where: { shopId } });
      if (newClosedDates.length > 0) {
        await db.shopClosedDate.createMany({
          data: newClosedDates.map((cd) => ({
            shopId,
            date: new Date(cd.date + "T00:00:00Z"),
            note: cd.note ?? null,
          })),
        });
      }
    }
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

  // Plan: lowercase (PlanTier enum: free | boost | featured | full). MVP default is 'full'.
  const planRaw = String(formData.get("plan") ?? "full").trim().toLowerCase();
  const plan = (["free", "boost", "featured", "full"].includes(planRaw) ? planRaw : "full") as AdsTier;

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

/** Flip the shop's is_open flag (owner-only). Revalidates dashboard + public shop page. */
export async function toggleShopOpen(shopId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const shop = await db.shop.findFirst({
    where: { id: shopId, ownerId: user.id },
    select: { id: true, slug: true, isOpen: true },
  });
  if (!shop) return;

  await withActor(user.id, async () => {
    await db.shop.update({
      where: { id: shop.id },
      data: { isOpen: !shop.isOpen },
    });
  });

  revalidatePath("/sell/dashboard");
  revalidatePath(`/shop/${shop.slug}`);
}

export async function createProduct(formData: FormData): Promise<{ ok: boolean; error?: string; slug?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  // Support both new (shop_id) and legacy (boutique_id) field names
  const shopId = String(formData.get("shop_id") ?? formData.get("boutique_id") ?? "").trim();
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

  // Parse price tiers + deposit (new format: price_mode + price_tiers)
  const priceData = parsePriceTiersFromForm(formData);
  if ("ok" in priceData) return { ok: false, error: priceData.error };

  const sharedDeposit = priceData.deposit;

  // Parse variants
  const variantInputs = parseVariants(formData);
  const sizeRaw = (String(formData.get("size") ?? "M") as DbSize);

  const variantsToCreate: VariantInput[] = variantInputs.length > 0
    ? variantInputs
    : [{ size: sizeRaw, quantity: 1, available: true, bustCm: null, waistCm: null, lengthCm: null }];

  // Compute derived base prices
  let basePerDay: number;
  let variantPriceMap: Map<DbSize, number>;

  if (priceData.mode === "shared") {
    basePerDay = Math.min(...priceData.shared.map((t) => t.pricePerDay));
    variantPriceMap = new Map(variantsToCreate.map((v) => [v.size, basePerDay]));
  } else {
    variantPriceMap = new Map(
      priceData.perSize.map((ps) => [ps.size, Math.min(...ps.tiers.map((t) => t.pricePerDay))])
    );
    basePerDay = Math.min(...Array.from(variantPriceMap.values()));
  }

  const lineUrlRaw = String(formData.get("line_url") ?? "").trim();
  const lineUrl = lineUrlRaw ? normalizeLineUrl(lineUrlRaw) : shop.lineUrl;

  const imagesRaw = String(formData.get("images") ?? "").trim();
  const images = imagesRaw ? imagesRaw.split("\n").map((s) => s.trim()).filter(Boolean) : [];

  // Resolve tag_selections JSON → tag IDs (generic, all bound groups)
  const tagSelectionsRaw = formData.get("tag_selections");
  let selectionsByGroup: Record<string, string[]> = {};
  if (tagSelectionsRaw) {
    try { selectionsByGroup = JSON.parse(String(tagSelectionsRaw)); } catch { /* ignore */ }
  } else {
    // Legacy fallback: if tag_selections absent but occasions present, wrap it
    const occasionKeys = formData.getAll("occasions").map(String).filter(Boolean);
    if (occasionKeys.length > 0) selectionsByGroup = { occasion: occasionKeys };
  }

  // Resolve productTypeId (seller UI is dress-only today)
  const productType = await db.productType.findUnique({ where: { key: "dress" }, select: { id: true } });
  if (!productType) return { ok: false, error: "product type ไม่พบ — กรุณาแจ้ง admin" };

  // Resolve tags via binding-aware validator
  const tagResolve = await resolveTagSelections(productType.id, selectionsByGroup);
  if (!tagResolve.ok) return { ok: false, error: tagResolve.error };
  const tagIds = tagResolve.tagIds;

  const tagCode = `DR${String(Date.now()).slice(-4).padStart(4, "0")}`;

  // Policy override
  const policyOverride = String(formData.get("policy_override") ?? "false") === "true";
  const parsePolicyInt = (key: string): number | null => {
    const v = String(formData.get(key) ?? "").trim();
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) || n < 0 ? null : n;
  };

  return withActor(user.id, async () => {
    const created = await db.product.create({
      data: {
        slug: productSlug(name),
        tagCode,
        name,
        designer: String(formData.get("designer") ?? "").trim() || null,
        shopId,
        productTypeId: productType.id,
        size: sizeRaw,
        pricePerDay: basePerDay,
        deposit: sharedDeposit,
        description: String(formData.get("description") ?? "").trim() || null,
        lineUrl,
        status: "pending",
        available: true,
        policyOverride,
        leadTimeDays: policyOverride ? parsePolicyInt("lead_time_days") : null,
        minRentalDays: policyOverride ? parsePolicyInt("min_rental_days") : null,
        maxRentalDays: policyOverride ? parsePolicyInt("max_rental_days") : null,
        returnWindowDays: policyOverride ? parsePolicyInt("return_window_days") : null,
        bufferDaysAfter: policyOverride ? parsePolicyInt("buffer_days_after") : null,
        images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
        ...(tagIds.length > 0 ? { productTags: { create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
      select: { id: true, slug: true },
    });

    // Create variants
    const createdVariants: { id: string; size: DbSize }[] = [];
    for (const vi of variantsToCreate) {
      const variantPrice = variantPriceMap.get(vi.size) ?? basePerDay;
      const created_v = await db.productVariant.upsert({
        where: { productId_size: { productId: created.id, size: vi.size } },
        create: {
          productId: created.id,
          size: vi.size,
          quantity: vi.quantity,
          pricePerDay: variantPrice,
          deposit: sharedDeposit,
          available: vi.available,
          bustCm: vi.bustCm,
          waistCm: vi.waistCm,
          lengthCm: vi.lengthCm,
        },
        update: {
          quantity: vi.quantity,
          pricePerDay: variantPrice,
          deposit: sharedDeposit,
          available: vi.available,
          bustCm: vi.bustCm,
          waistCm: vi.waistCm,
          lengthCm: vi.lengthCm,
        },
        select: { id: true, size: true },
      });
      createdVariants.push({ id: created_v.id, size: created_v.size as DbSize });
    }

    // Create ProductPriceTier rows
    if (priceData.mode === "shared") {
      await db.productPriceTier.createMany({
        data: priceData.shared.map((t) => ({ productId: created.id, variantId: null, minDays: t.minDays, pricePerDay: t.pricePerDay })),
      });
    } else {
      for (const ps of priceData.perSize) {
        const variant = createdVariants.find((v) => v.size === ps.size);
        if (!variant) continue;
        await db.productPriceTier.createMany({
          data: ps.tiers.map((t) => ({ productId: created.id, variantId: variant.id, minDays: t.minDays, pricePerDay: t.pricePerDay })),
        });
      }
    }

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
  for (const f of ["name","designer","size","description"] as const) {
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

  // Policy override fields
  const policyOverrideRaw = formData.get("policy_override");
  if (policyOverrideRaw !== null) {
    const override = policyOverrideRaw === "true";
    scalarUpdates.policyOverride = override;
    const parsePInt = (key: string): number | null => {
      const v = String(formData.get(key) ?? "").trim();
      if (!v) return null;
      const n = parseInt(v, 10);
      return isNaN(n) || n < 0 ? null : n;
    };
    if (override) {
      scalarUpdates.leadTimeDays = parsePInt("lead_time_days");
      scalarUpdates.minRentalDays = parsePInt("min_rental_days");
      scalarUpdates.maxRentalDays = parsePInt("max_rental_days");
      scalarUpdates.returnWindowDays = parsePInt("return_window_days");
      scalarUpdates.bufferDaysAfter = parsePInt("buffer_days_after");
    } else {
      // Override turned off — clear all override columns
      scalarUpdates.leadTimeDays = null;
      scalarUpdates.minRentalDays = null;
      scalarUpdates.maxRentalDays = null;
      scalarUpdates.returnWindowDays = null;
      scalarUpdates.bufferDaysAfter = null;
    }
  }

  // Parse price tiers (new format: price_mode + price_tiers)
  const hasPriceMode = formData.has("price_mode");
  let priceData: ReturnType<typeof parsePriceTiersFromForm> | null = null;
  if (hasPriceMode) {
    priceData = parsePriceTiersFromForm(formData);
    if ("ok" in priceData) return { ok: false, error: priceData.error };
  }

  // If price mode submitted, update derived price fields
  if (priceData && !("ok" in priceData)) {
    const sharedDeposit = priceData.deposit;
    scalarUpdates.deposit = sharedDeposit;

    if (priceData.mode === "shared") {
      const basePerDay = Math.min(...priceData.shared.map((t) => t.pricePerDay));
      scalarUpdates.pricePerDay = basePerDay;
    }
    // per_size: pricePerDay computed after variant upsert below
  }

  // Parse images (child table replace)
  let newImages: string[] | null = null;
  const imagesRaw = formData.get("images");
  if (imagesRaw !== null) {
    newImages = String(imagesRaw).split("\n").map((s) => s.trim()).filter(Boolean);
  }

  // Parse tag_selections → resolve tag IDs (child table replace)
  let newTagIds: string[] | null = null;
  const tagSelectionsRawUpdate = formData.get("tag_selections");
  if (tagSelectionsRawUpdate !== null) {
    let selByGroup: Record<string, string[]> = {};
    try { selByGroup = JSON.parse(String(tagSelectionsRawUpdate)); } catch { /* ignore */ }
    const resolved = await resolveTagSelections(product.productTypeId, selByGroup);
    if (!resolved.ok) return { ok: false, error: resolved.error };
    newTagIds = resolved.tagIds;
  } else {
    // Legacy fallback: occasions field
    const occKeys = formData.getAll("occasions").map(String).filter(Boolean);
    if (occKeys.length > 0) {
      const selByGroup: Record<string, string[]> = { occasion: occKeys };
      const resolved = await resolveTagSelections(product.productTypeId, selByGroup);
      if (!resolved.ok) return { ok: false, error: resolved.error };
      newTagIds = resolved.tagIds;
    } else if (formData.has("occasions")) {
      newTagIds = [];
    }
  }

  // Parse variants from formData (optional — only update if provided)
  const newVariants = parseVariants(formData);

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

    // Upsert variants
    const updatedVariants: { id: string; size: string }[] = [];
    if (newVariants.length > 0 && priceData && !("ok" in priceData)) {
      const sharedDeposit = priceData.deposit;
      const variantPriceMap: Map<string, number> = new Map();
      if (priceData.mode === "shared") {
        const basePerDay = Math.min(...priceData.shared.map((t) => t.pricePerDay));
        for (const vi of newVariants) variantPriceMap.set(vi.size, basePerDay);
      } else {
        for (const ps of priceData.perSize) {
          variantPriceMap.set(ps.size, Math.min(...ps.tiers.map((t) => t.pricePerDay)));
        }
      }
      for (const vi of newVariants) {
        const variantPrice = variantPriceMap.get(vi.size) ?? (scalarUpdates.pricePerDay as number ?? 0);
        const v = await db.productVariant.upsert({
          where: { productId_size: { productId, size: vi.size } },
          create: { productId, size: vi.size, quantity: vi.quantity, pricePerDay: variantPrice, deposit: sharedDeposit, available: vi.available, bustCm: vi.bustCm, waistCm: vi.waistCm, lengthCm: vi.lengthCm },
          update: { quantity: vi.quantity, pricePerDay: variantPrice, deposit: sharedDeposit, available: vi.available, bustCm: vi.bustCm, waistCm: vi.waistCm, lengthCm: vi.lengthCm },
          select: { id: true, size: true },
        });
        updatedVariants.push({ id: v.id, size: v.size });
      }
      // Update product.pricePerDay from min variant price (per_size mode)
      if (priceData.mode === "per_size" && updatedVariants.length > 0) {
        const minVariantPrice = Math.min(...updatedVariants.map((v) => variantPriceMap.get(v.size) ?? Infinity));
        if (Number.isFinite(minVariantPrice)) {
          await db.product.update({ where: { id: productId }, data: { pricePerDay: minVariantPrice } });
        }
      }
    } else if (newVariants.length > 0) {
      // No price mode — legacy path (just update qty/available/measurements)
      for (const vi of newVariants) {
        const v = await db.productVariant.upsert({
          where: { productId_size: { productId, size: vi.size } },
          create: { productId, size: vi.size, quantity: vi.quantity, pricePerDay: 0, deposit: 0, available: vi.available, bustCm: vi.bustCm, waistCm: vi.waistCm, lengthCm: vi.lengthCm },
          update: { quantity: vi.quantity, available: vi.available, bustCm: vi.bustCm, waistCm: vi.waistCm, lengthCm: vi.lengthCm },
          select: { id: true, size: true },
        });
        updatedVariants.push({ id: v.id, size: v.size });
      }
    }

    // Replace price tiers if price_mode was submitted
    if (priceData && !("ok" in priceData)) {
      await db.productPriceTier.deleteMany({ where: { productId } });
      if (priceData.mode === "shared") {
        await db.productPriceTier.createMany({
          data: priceData.shared.map((t) => ({ productId, variantId: null, minDays: t.minDays, pricePerDay: t.pricePerDay })),
        });
      } else {
        for (const ps of priceData.perSize) {
          const variant = updatedVariants.find((v) => v.size === ps.size);
          if (!variant) continue;
          await db.productPriceTier.createMany({
            data: ps.tiers.map((t) => ({ productId, variantId: variant.id, minDays: t.minDays, pricePerDay: t.pricePerDay })),
          });
        }
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

/** Flip a product's available flag (owner-only). Mirrors toggleShopOpen pattern. */
export async function toggleProductAvailable(productId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { available: true, shop: { select: { ownerId: true } } },
  });
  if (!product || product.shop.ownerId !== user.id) return;

  const next = !product.available;

  await withActor(user.id, async () => {
    await db.product.update({ where: { id: productId }, data: { available: next } });
  });

  revalidatePath("/sell/products");
  revalidatePath("/sell/dashboard");
  revalidatePath(`/product/${productId}`);
}

export async function replyToReview(reviewId: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const trimmed = String(text ?? "").trim().slice(0, 500);
  if (!trimmed) return { ok: false, error: "กรุณาใส่ข้อความตอบกลับ" };

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { shopId: true },
  });
  if (!review) return { ok: false, error: "ไม่พบรีวิว" };

  const shop = await db.shop.findUnique({ where: { id: review.shopId }, select: { ownerId: true, slug: true } });
  if (!shop || shop.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์ตอบรีวิวของร้านนี้" };

  return withActor(user.id, async () => {
    await db.review.update({
      where: { id: reviewId },
      data: { sellerReply: trimmed, sellerRepliedAt: new Date() },
    });
    revalidatePath(`/shop/${shop.slug}`);
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
