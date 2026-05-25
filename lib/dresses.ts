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
  priceMax?: number;
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
};

const PUBLIC_DRESS_QUERY =
  "id,slug,tag_code,name,designer,boutique_id,boutique_name,size,color,price_per_day,deposit,description,images,occasions,line_url,ads_tier,featured,sponsored,status,available,views,created_at,updated_at";

// Public-safe column allowlist for boutiques. Mirrors the column-level GRANT
// in migration 2026-05-18_boutique_address_privacy.sql — DO NOT add address,
// lat, lng, house_no, street, subdistrict, or postal_code here. Those are
// owner-only and reading them as anon will 403 post-migration.
const PUBLIC_BOUTIQUE_QUERY =
  "id,slug,name,owner_id,owner_name,area_key,area_label,hours,line_url,instagram,since_year,cover_color,tag,story,delivery_info,featured,ads_tier,status,kyc_status,verified,district,province,created_at,updated_at";

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
  if (typeof opts.priceMax === "number") q = q.lte("price_per_day", opts.priceMax);
  if (opts.occasions && opts.occasions.length) q = q.overlaps("occasions", opts.occasions);
  if (opts.limit) q = q.limit(opts.limit);

  const [{ data, error }, verifiedSet] = await Promise.all([
    q,
    fetchVerifiedBoutiqueIds(),
  ]);
  if (error) {
    console.error("[doprent] supabase listDresses error", error);
    return [];
  }
  let rows = ((data ?? []) as Dress[]).map((d) => ({
    ...d,
    boutique_verified: verifiedSet.has(d.boutique_id),
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
