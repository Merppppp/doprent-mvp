import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { Blackout, Color, Occasion, OccasionKey, PriceTier, Product, ProductCard, AdsTier, Shop, Status, KycStatus, Size } from "./types";

/**
 * Curated occasion presentation metadata (UI-side constant).
 * rev 3: occasions live in the tag system (tag_groups.key = "occasion") which
 * has no color/en/sort columns — those stay here, keyed by tag key. Also the
 * fallback list when the tag system has no occasion tags yet.
 */
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

/** Default catalog product type — preserves today's dress-only browse behavior. */
const DEFAULT_PRODUCT_TYPE_KEY = "dress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductFilters = {
  color?: Color | "all";
  sizes?: string[];
  occasions?: OccasionKey[];
  shopSlugs?: string[];
  designers?: string[];
  /** Category business key — additive optional filter (rev 3 taxonomy). */
  category?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  page?: number;
};

// ---------------------------------------------------------------------------
// Mappers  (Prisma camelCase + child relations → flat TypeScript snake_case)
// ---------------------------------------------------------------------------

/** Standard include that hydrates everything mapProduct needs. */
const PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
  priceTiers: { orderBy: { minDays: "asc" }, select: { minDays: true, pricePerDay: true } },
  productTags: { select: { tag: { select: { key: true, tagGroup: { select: { key: true } } } } } },
  productType: { select: { key: true } },
  category: { select: { key: true } },
  shop: { select: { name: true, verified: true, area: { select: { key: true } } } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

type PrismaShop = Prisma.ShopGetPayload<{ include: { area: { select: { key: true } } } }>;

/** Normalized price tier rows (min_days + price_per_day) → public PriceTier shape
 *  ({min, max, per_day}: contiguous ranges; last tier max = null = open-ended). */
function mapPriceTiers(tiers: Array<{ minDays: number; pricePerDay: number }>): PriceTier[] {
  return tiers.map((t, i) => ({
    min: t.minDays,
    max: i < tiers.length - 1 ? tiers[i + 1].minDays - 1 : null,
    per_day: t.pricePerDay,
  }));
}

function mapProduct(d: ProductRow): Product {
  return {
    id: d.id,
    slug: d.slug,
    tag_code: d.tagCode,
    name: d.name,
    designer: d.designer,
    shop_id: d.shopId,
    shop_name: d.shop.name,
    shop_verified: d.shop.verified,
    area_key: d.shop.area?.key ?? null,
    product_type_key: d.productType.key,
    category_key: d.category?.key ?? null,
    size: d.size as Size,
    color: d.color as Color,
    price_per_day: d.pricePerDay,
    deposit: d.deposit,
    price_tiers: mapPriceTiers(d.priceTiers),
    description: d.description,
    images: d.images.map((img) => img.url),
    occasions: d.productTags
      .filter((pt) => pt.tag.tagGroup.key === "occasion")
      .map((pt) => pt.tag.key as OccasionKey),
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
  };
}

function mapShop(b: PrismaShop, coverImage?: string | null): Shop {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    owner_id: b.ownerId,
    owner_name: b.ownerName,
    area_key: b.area?.key ?? null,
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
    cover_image: coverImage ?? null,
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
// Banner fallbacks — rotating set assigned to shops with no product images
// ---------------------------------------------------------------------------

const FALLBACK_BANNERS = [
  '/banners/banner-1.png',
  '/banners/banner-2.png',
  '/banners/banner-3.png',
  '/banners/banner-4.png',
  '/banners/banner-5.png',
  '/banners/banner-6.png',
] as const;

/** Shop-card product preview include (first image only, sorted). */
const SHOP_PRODUCT_PREVIEW = {
  take: 5,
  where: { status: "live", available: true },
  select: {
    id: true,
    name: true,
    pricePerDay: true,
    images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
  },
  orderBy: { featured: "desc" },
} satisfies Prisma.Shop$productsArgs;

type ShopWithPreviews = PrismaShop & {
  products: Array<{
    id: string;
    name: string;
    pricePerDay: number;
    images: Array<{ url: string }>;
  }>;
};

function mapShopWithCards(r: ShopWithPreviews, index: number): Shop {
  const coverImage = r.products?.[0]?.images?.[0]?.url
    ?? FALLBACK_BANNERS[index % FALLBACK_BANNERS.length];
  const shop = mapShop(r, coverImage);
  shop.product_cards = r.products.map((p) => ({
    id: p.id,
    name: p.name,
    price_per_day: p.pricePerDay,
    image: p.images?.[0]?.url ?? null,
  } satisfies ProductCard));
  return shop;
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function listProducts(
  opts: ProductFilters & { limit?: number } = {}
): Promise<{ items: Product[]; total: number; hasMore: boolean }> {
  const PAGE_SIZE = 25;
  const page = Math.max(1, opts.page ?? 1);

  // Build where clause — catalog default: dress-type products only
  // (preserves today's behavior until multi-type browse ships).
  const where: Prisma.ProductWhereInput = {
    status: "live",
    available: true,
    productType: { key: DEFAULT_PRODUCT_TYPE_KEY },
  };

  if (opts.color && opts.color !== "all") where.color = opts.color;
  if (opts.sizes?.length) where.size = { in: opts.sizes as unknown as Prisma.EnumSizeFilter<"Product">["in"] };

  // priceMin + priceMax
  if (typeof opts.priceMin === "number" || typeof opts.priceMax === "number") {
    where.pricePerDay = {
      ...(typeof opts.priceMin === "number" ? { gte: opts.priceMin } : {}),
      ...(typeof opts.priceMax === "number" ? { lte: opts.priceMax } : {}),
    };
  }

  // Occasions filter — rev 3: via product_tags (tag group "occasion")
  if (opts.occasions?.length) {
    where.productTags = {
      some: { tag: { key: { in: opts.occasions }, tagGroup: { key: "occasion" } } },
    };
  }

  // Category filter (additive, key-based)
  if (opts.category) {
    where.category = { key: opts.category };
  }

  // Designers filter (DB level)
  if (opts.designers?.length) {
    where.designer = { in: opts.designers };
  }

  // Shop slugs filter (DB level via relation)
  if (opts.shopSlugs?.length) {
    where.shop = { slug: { in: opts.shopSlugs } };
  }

  // Fuzzy search — split terms, each must match at least one field.
  // Shop name is matched via the relation (products no longer carry the
  // denormalized boutique_name column, and the FTS vector no longer
  // includes it — so the shop-name match is ORed in here explicitly).
  if (opts.search) {
    const terms = opts.search.split(/\s+/).filter(Boolean);
    if (terms.length > 0) {
      where.AND = terms.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { designer: { contains: term, mode: "insensitive" as const } },
          { shop: { name: { contains: term, mode: "insensitive" as const } } },
          { description: { contains: term, mode: "insensitive" as const } },
        ],
      }));
    }
  }

  // Date range: exclude products with any blackout in range
  if (opts.dateFrom || opts.dateTo) {
    const blocked = await db.productBlackoutDate.findMany({
      where: {
        date: {
          gte: opts.dateFrom ? new Date(opts.dateFrom) : undefined,
          lte: opts.dateTo ? new Date(opts.dateTo) : undefined,
        },
      },
      select: { productId: true },
    });
    const blockedIds = [...new Set(blocked.map((b) => b.productId))];
    if (blockedIds.length > 0) where.id = { notIn: blockedIds };
  }

  // DB-level sort
  let orderBy: Prisma.ProductOrderByWithRelationInput[];
  switch (opts.sort) {
    case "price-asc":  orderBy = [{ pricePerDay: "asc" }]; break;
    case "price-desc": orderBy = [{ pricePerDay: "desc" }]; break;
    case "name":       orderBy = [{ name: "asc" }]; break;
    default:           orderBy = [{ featured: "desc" }, { sponsored: "desc" }, { createdAt: "desc" }];
  }

  // Pagination
  const take = opts.limit ?? PAGE_SIZE;
  const skip = opts.limit ? 0 : (page - 1) * PAGE_SIZE;

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy,
      take,
      skip,
    }),
    db.product.count({ where }),
  ]);

  const items = rows.map(mapProduct);
  const hasMore = opts.limit ? false : (page * PAGE_SIZE) < total;

  return { items, total, hasMore };
}

export async function listDesigners(): Promise<string[]> {
  const rows = await db.product.findMany({
    where: {
      status: "live",
      available: true,
      designer: { not: null },
      productType: { key: DEFAULT_PRODUCT_TYPE_KEY },
    },
    select: { designer: true },
    distinct: ["designer"],
  });
  return rows
    .map((r) => r.designer?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const d = await db.product.findUnique({ where: { slug }, include: PRODUCT_INCLUDE });
  if (!d) return null;
  return mapProduct(d);
}

/**
 * Paid sponsor strip — shops on a paid ads_tier (boost/featured).
 * Powers the home marquee as a sponsored-shop placement. Featured first,
 * then boost. Returns [] when no one is on a paid plan yet (caller falls
 * back to the plain verified strip so it never renders empty).
 */
export async function listSponsorShops(limit = 8): Promise<Shop[]> {
  try {
    const rows = await db.shop.findMany({
      where: {
        status: "live",
        adsTier: { in: ["boost", "featured"] },
      },
      include: {
        area: { select: { key: true } },
        products: SHOP_PRODUCT_PREVIEW,
      },
      orderBy: [{ adsTier: "desc" }, { featured: "desc" }, { name: "asc" }],
      take: limit,
    });
    return rows.map((r, index) => mapShopWithCards(r, index));
  } catch {
    return [];
  }
}

export async function listShops(opts: { limit?: number; featuredFirst?: boolean } = {}): Promise<Shop[]> {
  const rows = await db.shop.findMany({
    where: { status: "live" },
    include: {
      area: { select: { key: true } },
      products: SHOP_PRODUCT_PREVIEW,
    },
    orderBy: [
      ...(opts.featuredFirst ? [{ featured: "desc" as const }] : []),
      { name: "asc" },
    ],
    take: opts.limit,
  });
  return rows.map((r, index) => mapShopWithCards(r, index));
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const b = await db.shop.findUnique({
    where: { slug },
    include: { area: { select: { key: true } } },
  });
  return b ? mapShop(b, null) : null;
}

/** Fetch live products by id list (e.g. a user's saved/favorite products). */
export async function listProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: ids }, status: "live" },
    include: PRODUCT_INCLUDE,
  });
  return rows.map(mapProduct);
}

export async function listProductsByShop(shopId: string): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: { shopId, status: "live", available: true },
    include: PRODUCT_INCLUDE,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapProduct);
}

/**
 * List occasions for the UI (landing row, filters, nav).
 * rev 3: sourced from the tag system (group "occasion"); th = tags.label,
 * en/color_token/sort_order come from the curated FALLBACK_OCCASIONS constant
 * (the tag system has no color/en/sort columns). Unknown tag keys get safe
 * defaults and sort last. Return shape unchanged.
 */
export async function listOccasions(): Promise<Occasion[]> {
  const rows = await db.tag.findMany({
    where: { isActive: true, tagGroup: { key: "occasion" } },
    select: { key: true, label: true },
  });
  if (!rows.length) return FALLBACK_OCCASIONS;
  return rows
    .map((r) => {
      const meta = FALLBACK_OCCASIONS.find((f) => f.key === r.key);
      return {
        key: r.key as OccasionKey,
        th: r.label || meta?.th || r.key,
        en: meta?.en ?? r.key,
        color_token: meta?.color_token ?? ("rose" as Color),
        sort_order: meta?.sort_order ?? 99,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key));
}

export async function listBlackouts(productId: string): Promise<string[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db.productBlackoutDate.findMany({
    where: { productId, date: { gte: today } },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => r.date.toISOString().slice(0, 10));
}

export async function getStats(): Promise<{ shops: number; products: number; minPrice: number }> {
  const [shops, products, cheapest] = await Promise.all([
    db.shop.count({ where: { status: "live" } }),
    db.product.count({
      where: { status: "live", available: true, productType: { key: DEFAULT_PRODUCT_TYPE_KEY } },
    }),
    db.product.findFirst({
      where: { status: "live", available: true, productType: { key: DEFAULT_PRODUCT_TYPE_KEY } },
      orderBy: { pricePerDay: "asc" },
      select: { pricePerDay: true },
    }),
  ]);
  return { shops, products, minPrice: cheapest?.pricePerDay ?? 1500 };
}

export async function getBlackoutsByProduct(productId: string): Promise<Blackout[]> {
  const rows = await db.productBlackoutDate.findMany({
    where: { productId },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    product_id: r.productId,
    date: r.date.toISOString().slice(0, 10),
    created_at: r.createdAt.toISOString(),
  }));
}

export async function getBlackoutsByMonth(
  productIds: string[],
  month: string, // YYYY-MM
): Promise<Array<{ product_id: string; date: string }>> {
  if (!productIds.length) return [];
  const [year, mon] = month.split("-").map(Number);
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0); // last day
  const rows = await db.productBlackoutDate.findMany({
    where: { productId: { in: productIds }, date: { gte: monthStart, lte: monthEnd } },
  });
  return rows.map((r) => ({
    product_id: r.productId,
    date: r.date.toISOString().slice(0, 10),
  }));
}

export async function listSimilarProducts(seed: Product, limit = 4): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: {
      status: "live",
      available: true,
      NOT: { id: seed.id },
      productType: { key: seed.product_type_key || DEFAULT_PRODUCT_TYPE_KEY },
    },
    include: PRODUCT_INCLUDE,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  const pool = rows.map(mapProduct);
  const seedOccasions = new Set(seed.occasions ?? []);

  function score(d: Product): number {
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
    if (d.shop_id === seed.shop_id) s += 1;
    return s;
  }

  return pool
    .map((d) => ({ d, s: score(d) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ d }) => d);
}

export const isSupabaseConfigured = false;
