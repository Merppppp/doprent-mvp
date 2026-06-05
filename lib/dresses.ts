import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Boutique, Color, Dress, Occasion, OccasionKey } from "./types";

/** Hard-coded occasions in case occasions table isn't seeded yet */
const FALLBACK_OCCASIONS: Occasion[] = [
  { key: "engagement", th: "งานหมั้น", en: "Engagement", color_token: "rose", sort_order: 1 },
  { key: "wedding", th: "งานแต่ง", en: "Wedding", color_token: "ivory", sort_order: 2 },
  { key: "cocktail", th: "ค็อกเทล", en: "Cocktail", color_token: "green", sort_order: 3 },
  { key: "evening", th: "ราตรี", en: "Evening", color_token: "navy", sort_order: 4 },
  { key: "gala", th: "กาล่า", en: "Gala", color_token: "red", sort_order: 5 },
  { key: "party", th: "ปาร์ตี้", en: "Party", color_token: "purple", sort_order: 6 },
  { key: "work", th: "ทำงาน", en: "Work", color_token: "black", sort_order: 7 },
  { key: "casual", th: "ลำลอง", en: "Casual", color_token: "blue", sort_order: 8 },
];

/** Filter shape used by the Browse page. */
export type DressFilters = {
  color?: Color | "all";
  sizes?: string[];
  occasions?: OccasionKey[];
  boutiqueSlugs?: string[];
  designers?: string[];
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
};

const PUBLIC_DRESS_QUERY =
  "id,slug,name,designer,boutique_id,boutique_name,size,color,price_per_day,deposit,description,images,occasions,line_url,ads_tier,featured,sponsored,status,available,views,created_at,updated_at";

// Public-safe column allowlist for boutiques. Mirrors the column-level GRANT
// in migration 2026-05-18_boutique_address_privacy.sql — DO NOT add address,
// lat, lng, house_no, street, subdistrict, or postal_code here. Those are
// owner-only and reading them as anon will 403 post-migration.
const PUBLIC_BOUTIQUE_QUERY =
  "id,slug,name,owner_id,owner_name,area_key,area_label,hours,line_url,instagram,since_year,cover_color,tag,story,featured,ads_tier,status,kyc_status,verified,district,province,created_at,updated_at";

/** Cache for verified boutique-ID lookup within a single request. */
async function fetchVerifiedBoutiqueIds(): Promise<Set<string>> {
  const sb = getSupabase();
  if (!sb) return new Set();
  const { data, error } = await sb
    .from("boutiques")
    .select("id")
    .eq("verified", true);
  if (error) {
    // Column may not exist yet (pre-migration). Fail soft.
    return new Set();
  }
  return new Set(((data ?? []) as Array<{ id: string }>).map((r) => r.id));
}

/** Map of boutique_id -> area_key, to denormalize shop area onto dresses (for distance display). */
async function fetchBoutiqueAreaMap(): Promise<Map<string, string | null>> {
  const sb = getSupabase();
  if (!sb) return new Map();
  const { data, error } = await sb.from("boutiques").select("id, area_key");
  if (error) return new Map();
  return new Map(
    ((data ?? []) as Array<{ id: string; area_key: string | null }>).map((r) => [r.id, r.area_key]),
  );
}

/** Fetch up to `limit` live, available dresses, ordered by ads tier then recency. */
export async function listDresses(opts: DressFilters & { limit?: number } = {}): Promise<Dress[]> {
  const sb = getSupabase();
  if (!sb) return [];

  let q = sb
    .from("dresses")
    .select(PUBLIC_DRESS_QUERY)
    .eq("status", "live")
    .eq("available", true)
    .order("featured", { ascending: false })
    .order("sponsored", { ascending: false })
    .order("created_at", { ascending: false });

  if (opts.color && opts.color !== "all") q = q.eq("color", opts.color);
  if (opts.sizes && opts.sizes.length) q = q.in("size", opts.sizes);
  if (opts.boutiqueSlugs && opts.boutiqueSlugs.length) {
    // We have boutique_name denormalized; join via boutiques table would be ideal,
    // but for performance we'll filter at the application layer for now.
  }
  if (typeof opts.priceMin === "number") q = q.gte("price_per_day", opts.priceMin);
  if (typeof opts.priceMax === "number") q = q.lte("price_per_day", opts.priceMax);
  if (opts.occasions && opts.occasions.length) q = q.overlaps("occasions", opts.occasions);
  if (opts.limit) q = q.limit(opts.limit);

  const [{ data, error }, verifiedSet, areaMap] = await Promise.all([
    q,
    fetchVerifiedBoutiqueIds(),
    fetchBoutiqueAreaMap(),
  ]);
  if (error) {
    console.error("[doprent] supabase listDresses error", error);
    return [];
  }
  let rows = ((data ?? []) as Dress[]).map((d) => ({
    ...d,
    boutique_verified: verifiedSet.has(d.boutique_id),
    area_key: areaMap.get(d.boutique_id) ?? null,
  }));

  // Application-layer filters not supported cleanly by Supabase
  if (opts.search) {
    const needle = opts.search.toLowerCase();
    rows = rows.filter((d) =>
      `${d.name} ${d.designer ?? ""} ${d.boutique_name} ${d.color} ${d.description ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }
  if (opts.designers && opts.designers.length) {
    rows = rows.filter((d) => opts.designers!.includes(d.designer ?? ""));
  }

  switch (opts.sort) {
    case "price-asc":
      rows.sort((a, b) => a.price_per_day - b.price_per_day);
      break;
    case "price-desc":
      rows.sort((a, b) => b.price_per_day - a.price_per_day);
      break;
    case "name":
      rows.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }

  return rows;
}

/** Distinct designer names across live, available listings. Sorted A→Z. */
export async function listDesigners(): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("dresses")
    .select("designer")
    .eq("status", "live")
    .eq("available", true)
    .not("designer", "is", null)
    .neq("designer", "");
  if (error) {
    console.error("[doprent] supabase listDesigners error", error);
    return [];
  }
  const set = new Set<string>();
  ((data ?? []) as Array<{ designer: string | null }>).forEach((r) => {
    const d = (r.designer ?? "").trim();
    if (d) set.add(d);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function getDressBySlug(slug: string): Promise<Dress | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("dresses")
    .select(PUBLIC_DRESS_QUERY)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[doprent] supabase getDressBySlug error", error);
    return null;
  }
  return (data as Dress) ?? null;
}

export async function listBoutiques(opts: { limit?: number; featuredFirst?: boolean } = {}): Promise<
  Boutique[]
> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("boutiques").select(PUBLIC_BOUTIQUE_QUERY).eq("status", "live");
  if (opts.featuredFirst) q = q.order("featured", { ascending: false });
  q = q.order("name", { ascending: true });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) {
    console.error("[doprent] supabase listBoutiques error", error);
    return [];
  }
  return (data ?? []) as Boutique[];
}

/**
 * Paid sponsor strip — boutiques on a paid ads_tier (boost/featured).
 * Powers the home marquee as a sponsored-shop placement. Featured first,
 * then boost. Returns [] when no one is on a paid plan yet (caller falls
 * back to the plain verified strip so it never renders empty).
 */
export async function listSponsorBoutiques(limit = 8): Promise<Boutique[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("boutiques")
    .select(PUBLIC_BOUTIQUE_QUERY)
    .eq("status", "live")
    .in("ads_tier", ["boost", "featured"])
    .order("ads_tier", { ascending: false }) // 'featured' > 'boost' alphabetically
    .order("featured", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[doprent] supabase listSponsorBoutiques error", error);
    return [];
  }
  return (data ?? []) as Boutique[];
}

export async function getBoutiqueBySlug(slug: string): Promise<Boutique | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("boutiques")
    .select(PUBLIC_BOUTIQUE_QUERY)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[doprent] supabase getBoutiqueBySlug error", error);
    return null;
  }
  return (data as Boutique) ?? null;
}

/**
 * Content-based similarity scorer for the "ชุดที่คล้ายกัน" rail on
 * /dress/[slug]. Pools up to 60 recent live+available candidates (excluding
 * the seed dress), ranks them in-memory, returns the top `limit`.
 *
 * Weights — tuned for renter intent on DopRent (occasion is the primary
 * decision axis, then color/size/price band):
 *
 *   occasion overlap (Jaccard on shared keys)  ×5
 *   same color                                 ×3
 *   same size                                  ×3
 *   price within ±30%                          ×2
 *   same designer (when both have one)         ×2
 *   same boutique                              ×1  (low — section is
 *     primarily for discovery, the boutique card on the page already
 *     surfaces same-boutique inventory)
 *
 * Fallback: if scored pool yields fewer than `limit` results (e.g. tiny
 * inventory or every candidate scored 0), pads from the recency-sorted
 * remainder so the rail never renders empty.
 */
export async function listSimilarDresses(seed: Dress, limit = 4): Promise<Dress[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const [{ data, error }, verifiedSet] = await Promise.all([
    sb
      .from("dresses")
      .select(PUBLIC_DRESS_QUERY)
      .eq("status", "live")
      .eq("available", true)
      .neq("id", seed.id)
      .order("featured", { ascending: false })
      .order("sponsored", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
    fetchVerifiedBoutiqueIds(),
  ]);
  if (error) {
    console.error("[doprent] supabase listSimilarDresses error", error);
    return [];
  }
  const pool: Dress[] = ((data ?? []) as Dress[]).map((d) => ({
    ...d,
    boutique_verified: verifiedSet.has(d.boutique_id),
  }));

  const seedOcc = new Set(seed.occasions ?? []);
  const seedPrice = seed.price_per_day;
  const priceBand = seedPrice * 0.3; // ±30% window

  const scored = pool.map((d) => {
    let score = 0;

    // Occasion overlap — Jaccard to prevent a dress tagged for every
    // occasion from dominating purely on tag count.
    const dOcc = d.occasions ?? [];
    if (seedOcc.size && dOcc.length) {
      const shared = dOcc.filter((o) => seedOcc.has(o)).length;
      const union = new Set([...seedOcc, ...dOcc]).size;
      if (union > 0) score += (shared / union) * 5;
    }

    if (d.color === seed.color) score += 3;
    if (d.size === seed.size) score += 3;

    if (Math.abs(d.price_per_day - seedPrice) <= priceBand) score += 2;

    if (seed.designer && d.designer && d.designer === seed.designer) score += 2;

    if (d.boutique_id === seed.boutique_id) score += 1;

    return { dress: d, score };
  });

  // Sort by score desc, then by recency (pool already pre-sorted, so a
  // stable sort preserves recency among ties).
  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.filter((s) => s.score > 0).map((s) => s.dress);

  if (ranked.length >= limit) return ranked.slice(0, limit);

  // Fallback: pad from recency-sorted pool, skipping anything already in
  // the ranked list, so the rail always renders `limit` items if there
  // are at least `limit` other live dresses in the catalogue.
  const rankedIds = new Set(ranked.map((d) => d.id));
  const padding = pool.filter((d) => !rankedIds.has(d.id));
  return [...ranked, ...padding].slice(0, limit);
}

export async function listDressesByBoutique(boutiqueId: string): Promise<Dress[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const [{ data, error }, verifiedSet] = await Promise.all([
    sb
      .from("dresses")
      .select(PUBLIC_DRESS_QUERY)
      .eq("boutique_id", boutiqueId)
      .eq("status", "live")
      .eq("available", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
    fetchVerifiedBoutiqueIds(),
  ]);
  if (error) {
    console.error("[doprent] supabase listDressesByBoutique error", error);
    return [];
  }
  return ((data ?? []) as Dress[]).map((d) => ({
    ...d,
    boutique_verified: verifiedSet.has(d.boutique_id),
  }));
}

export async function listOccasions(): Promise<Occasion[]> {
  const sb = getSupabase();
  if (!sb) return FALLBACK_OCCASIONS;
  const { data, error } = await sb
    .from("occasions")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return FALLBACK_OCCASIONS;
  return data as Occasion[];
}

/**
 * Fetch all future blackout dates for a dress, sorted ascending.
 * Returns array of YYYY-MM-DD date strings.
 */
export async function listBlackouts(dressId: string): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("dress_blackouts")
    .select("date")
    .eq("dress_id", dressId)
    .gte("date", today)
    .order("date", { ascending: true });
  if (error) {
    // Table may not exist yet (pre-migration). Fail soft.
    return [];
  }
  return ((data ?? []) as Array<{ date: string }>).map((r) => r.date);
}

/** Lightweight count for landing page stats. */
export async function getStats(): Promise<{ boutiques: number; dresses: number; minPrice: number }> {
  const sb = getSupabase();
  if (!sb) return { boutiques: 0, dresses: 0, minPrice: 1500 };
  const [bRes, dRes, pRes] = await Promise.all([
    sb.from("boutiques").select("id", { count: "exact", head: true }).eq("status", "live"),
    sb.from("dresses").select("id", { count: "exact", head: true }).eq("status", "live").eq("available", true),
    sb
      .from("dresses")
      .select("price_per_day")
      .eq("status", "live")
      .eq("available", true)
      .order("price_per_day", { ascending: true })
      .limit(1),
  ]);
  const minPrice = (pRes.data?.[0] as { price_per_day?: number } | undefined)?.price_per_day ?? 1500;
  return {
    boutiques: bRes.count ?? 0,
    dresses: dRes.count ?? 0,
    minPrice,
  };
}

export { isSupabaseConfigured };
