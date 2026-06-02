import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { Blackout, Boutique, Color, Dress, Occasion, OccasionKey, PriceTier, AdsTier, Status, KycStatus, Size } from "./types";

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------

const FALLBACK_OCCASIONS: Occasion[] = [
  { key: "engagement", th: "งานหมั้น", en: "Engagement", color_token: "rose", sort_order: 1 },
  { key: "wedding",    th: "งานแต่ง",  en: "Wedding",    color_token: "ivory", sort_order: 2 },
  { key: "cocktail",   th: "ค็อกเทล",  en: "Cocktail",   color_token: "green", sort_order: 3 },
  { key: "evening",    th: "ราตรี",    en: "Evening",    color_token: "navy",  sort_order: 4 },
  { key: "gala",       th: "กาล่า",   en: "Gala",       color_token: "red",   sort_order: 5 },
  { key: "party",      th: "ปาร์ตี้",  en: "Party",      color_token: "purple",sort_order: 6 },
  { key: "work",       th: "ทำงาน",   en: "Work",       color_token: "black", sort_order: 7 },
  { key: "casual",     th: "ลำลอง",   en: "Casual",     color_token: "blue",  sort_order: 8 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DressFilters = {
  color?: Color | "all";
  sizes?: string[];
  occasions?: OccasionKey[];
  boutiqueSlugs?: string[];
  designers?: string[];
  priceMax?: number;
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
};

// ---------------------------------------------------------------------------
// Mappers  (Prisma camelCase → TypeScript snake_case)
// ---------------------------------------------------------------------------

type PrismaDress = Prisma.DressGetPayload<Record<string, never>>;
type PrismaBoutique = Prisma.BoutiqueGetPayload<Record<string, never>>;

function mapDress(d: PrismaDress, boutiqueVerified = false): Dress {
  return {
    id: d.id,
    slug: d.slug,
    tag_code: d.tagCode,
    name: d.name,
    designer: d.designer,
    boutique_id: d.boutiqueId,
    boutique_name: d.boutiqueName,
    size: d.size as Size,
    color: d.color as Color,
    price_per_day: d.pricePerDay,
    deposit: d.deposit,
    price_tiers: (d.priceTiers ?? []) as PriceTier[],
    description: d.description,
    images: (d.images ?? []) as string[],
    occasions: d.occasions as OccasionKey[],
    line_url: d.lineUrl,
    ads_tier: d.adsTier as AdsTier,
    featured: d.featured,
    sponsored: d.sponsored,
    status: d.status as Status,
    reject_reason: d.rejectReason,
    available: d.available,
    views: d.views,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
    boutique_verified: boutiqueVerified,
  };
}

function mapBoutique(b: PrismaBoutique): Boutique {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    owner_id: b.ownerId,
    owner_name: b.ownerName,
    area_key: b.areaKey,
    area_label: b.areaLabel,
    address: b.address,
    house_no: b.houseNo,
    street: b.street,
    subdistrict: b.subdistrict,
    district: b.district,
    province: b.province,
    postal_code: b.postalCode,
    lat: b.lat !== null ? Number(b.lat) : null,
    lng: b.lng !== null ? Number(b.lng) : null,
    hours: b.hours,
    line_url: b.lineUrl,
    instagram: b.instagram,
    since_year: b.sinceYear,
    cover_color: b.coverColor as Color,
    tag: b.tag,
    story: b.story,
    delivery_info: b.deliveryInfo,
    featured: b.featured,
    ads_tier: b.adsTier as AdsTier,
    verified: b.verified,
    status: b.status as Status,
    reject_reason: b.rejectReason,
    kyc_status: b.kycStatus as KycStatus,
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function listDresses(opts: DressFilters & { limit?: number } = {}): Promise<Dress[]> {
  // Build where clause
  const where: Prisma.DressWhereInput = {
    status: "live",
    available: true,
  };

  if (opts.color && opts.color !== "all") where.color = opts.color;
  if (opts.sizes?.length) where.size = { in: opts.sizes as string[] };
  if (typeof opts.priceMax === "number") where.pricePerDay = { lte: opts.priceMax };
  if (opts.occasions?.length) where.occasions = { hasSome: opts.occasions };
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { designer: { contains: opts.search, mode: "insensitive" } },
      { boutiqueName: { contains: opts.search, mode: "insensitive" } },
      { description: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  // Date range: exclude dresses with any blackout in range
  if (opts.dateFrom || opts.dateTo) {
    const blocked = await db.dressBlackout.findMany({
      where: {
        date: {
          gte: opts.dateFrom ? new Date(opts.dateFrom) : undefined,
          lte: opts.dateTo ? new Date(opts.dateTo) : undefined,
        },
      },
      select: { dressId: true },
    });
    const blockedIds = [...new Set(blocked.map((b) => b.dressId))];
    if (blockedIds.length > 0) where.id = { notIn: blockedIds };
  }

  const [rows, verifiedBoutiqueIds] = await Promise.all([
    db.dress.findMany({
      where,
      orderBy: [{ featured: "desc" }, { sponsored: "desc" }, { createdAt: "desc" }],
      take: opts.limit,
    }),
    db.boutique.findMany({
      where: { verified: true },
      select: { id: true },
    }).then((bs) => new Set(bs.map((b) => b.id))),
  ]);

  let dresses = rows.map((d) => mapDress(d, verifiedBoutiqueIds.has(d.boutiqueId)));

  // Application-layer filters
  if (opts.designers?.length) {
    dresses = dresses.filter((d) => opts.designers!.includes(d.designer ?? ""));
  }
  if (opts.boutiqueSlugs?.length) {
    const slugSet = new Set(opts.boutiqueSlugs);
    const boutiques = await db.boutique.findMany({
      where: { slug: { in: opts.boutiqueSlugs } },
      select: { id: true },
    });
    const boutiquesIds = new Set(boutiques.map((b) => b.id));
    dresses = dresses.filter((d) => boutiquesIds.has(d.boutique_id));
    void slugSet; // suppress unused warning
  }

  switch (opts.sort) {
    case "price-asc":  dresses.sort((a, b) => a.price_per_day - b.price_per_day); break;
    case "price-desc": dresses.sort((a, b) => b.price_per_day - a.price_per_day); break;
    case "name":       dresses.sort((a, b) => a.name.localeCompare(b.name)); break;
  }

  return dresses;
}

export async function listDesigners(): Promise<string[]> {
  const rows = await db.dress.findMany({
    where: { status: "live", available: true, designer: { not: null } },
    select: { designer: true },
    distinct: ["designer"],
  });
  return rows
    .map((r) => r.designer?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function getDressBySlug(slug: string): Promise<Dress | null> {
  const d = await db.dress.findUnique({ where: { slug } });
  if (!d) return null;
  const boutique = await db.boutique.findUnique({ where: { id: d.boutiqueId }, select: { verified: true } });
  return mapDress(d, boutique?.verified ?? false);
}

export async function listBoutiques(opts: { limit?: number; featuredFirst?: boolean } = {}): Promise<Boutique[]> {
  const rows = await db.boutique.findMany({
    where: { status: "live" },
    orderBy: [
      ...(opts.featuredFirst ? [{ featured: "desc" as const }] : []),
      { name: "asc" },
    ],
    take: opts.limit,
  });
  return rows.map(mapBoutique);
}

export async function getBoutiqueBySlug(slug: string): Promise<Boutique | null> {
  const b = await db.boutique.findUnique({ where: { slug } });
  return b ? mapBoutique(b) : null;
}

export async function listDressesByBoutique(boutiqueId: string): Promise<Dress[]> {
  const [rows, boutique] = await Promise.all([
    db.dress.findMany({
      where: { boutiqueId, status: "live", available: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    db.boutique.findUnique({ where: { id: boutiqueId }, select: { verified: true } }),
  ]);
  const verified = boutique?.verified ?? false;
  return rows.map((d) => mapDress(d, verified));
}

export async function listOccasions(): Promise<Occasion[]> {
  const rows = await db.occasion.findMany({ orderBy: { sortOrder: "asc" } });
  if (!rows.length) return FALLBACK_OCCASIONS;
  return rows.map((r) => ({
    key: r.key as OccasionKey,
    th: r.th,
    en: r.en,
    color_token: r.colorToken as Color,
    sort_order: r.sortOrder,
  }));
}

export async function listBlackouts(dressId: string): Promise<string[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db.dressBlackout.findMany({
    where: { dressId, date: { gte: today } },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => r.date.toISOString().slice(0, 10));
}

export async function getStats(): Promise<{ boutiques: number; dresses: number; minPrice: number }> {
  const [boutiques, dresses, cheapest] = await Promise.all([
    db.boutique.count({ where: { status: "live" } }),
    db.dress.count({ where: { status: "live", available: true } }),
    db.dress.findFirst({
      where: { status: "live", available: true },
      orderBy: { pricePerDay: "asc" },
      select: { pricePerDay: true },
    }),
  ]);
  return { boutiques, dresses, minPrice: cheapest?.pricePerDay ?? 1500 };
}

export async function getBlackoutsByDress(dressId: string): Promise<Blackout[]> {
  const rows = await db.dressBlackout.findMany({
    where: { dressId },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    dress_id: r.dressId,
    date: r.date.toISOString().slice(0, 10),
    created_at: r.createdAt.toISOString(),
  }));
}

export async function getBlackoutsByMonth(
  dressIds: string[],
  month: string, // YYYY-MM
): Promise<Array<{ dress_id: string; date: string }>> {
  if (!dressIds.length) return [];
  const [year, mon] = month.split("-").map(Number);
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0); // last day
  const rows = await db.dressBlackout.findMany({
    where: { dressId: { in: dressIds }, date: { gte: monthStart, lte: monthEnd } },
  });
  return rows.map((r) => ({
    dress_id: r.dressId,
    date: r.date.toISOString().slice(0, 10),
  }));
}

export async function listSimilarDresses(seed: Dress, limit = 4): Promise<Dress[]> {
  const [rows, verifiedSet] = await Promise.all([
    db.dress.findMany({
      where: { status: "live", available: true, NOT: { id: seed.id } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 60,
    }),
    db.boutique.findMany({ where: { verified: true }, select: { id: true } })
      .then((bs) => new Set(bs.map((b) => b.id))),
  ]);

  const pool = rows.map((d) => mapDress(d, verifiedSet.has(d.boutiqueId)));
  const seedOccasions = new Set(seed.occasions ?? []);

  function score(d: Dress): number {
    let s = 0;
    const dOcc = new Set(d.occasions ?? []);
    const intersection = [...seedOccasions].filter((o) => dOcc.has(o)).length;
    const union = new Set([...seedOccasions, ...dOcc]).size;
    if (union > 0) s += (intersection / union) * 5;
    if (d.color === seed.color) s += 3;
    if (d.size === seed.size) s += 3;
    const lo = seed.price_per_day * 0.7, hi = seed.price_per_day * 1.3;
    if (d.price_per_day >= lo && d.price_per_day <= hi) s += 2;
    if (seed.designer && d.designer === seed.designer) s += 2;
    if (d.boutique_id === seed.boutique_id) s += 1;
    return s;
  }

  return pool
    .map((d) => ({ d, s: score(d) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ d }) => d);
}

export const isSupabaseConfigured = false;
