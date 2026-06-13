import Link from "next/link";
import ProductResults from "@/components/ProductResults";
import BrowseFilters from "@/components/BrowseFilters";
import BannerCarousel from "@/components/BannerCarousel";
import type { BannerSlide } from "@/components/BannerCarousel";
import SortSelect from "@/components/SortSelect";
import MobileFilterDrawer from "@/components/MobileFilterDrawer";
import LocationControls from "@/components/LocationControls";
import { OccasionTile } from "@/components/ProductArt";
import {
  listDesigners,
  listProducts,
  listOccasions,
  listSponsorShops,
  listShops,
} from "@/lib/products";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBanners } from "@/lib/banners";
import {
  COLOR_LABELS_TH,
  COLOR_SWATCH,
  type Color,
  type OccasionKey,
  SIZES,
} from "@/lib/types";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";
const COLORS: Color[] = ["rose", "ivory", "green", "black", "navy", "red", "blue", "purple"];
const PRICE_BOUNDS = { min: 0, max: 10000 };

type SearchParams = {
  color?: string;
  occasion?: string;
  size?: string;
  designer?: string;
  q?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: string;
  priceMax?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const activeColor = (searchParams?.color ?? "all") as Color | "all";
  const activeOcc = searchParams?.occasion as OccasionKey | undefined;
  const activeSize = searchParams?.size;
  const activeDesigner = searchParams?.designer?.trim() || undefined;
  const search = searchParams?.q?.trim() ?? "";
  const activeDateFrom = searchParams?.dateFrom?.trim() || undefined;
  const activeDateTo = searchParams?.dateTo?.trim() || undefined;
  const activePriceMin = Number(searchParams?.priceMin) || PRICE_BOUNDS.min;
  const activePriceMax = Number(searchParams?.priceMax) || PRICE_BOUNDS.max;
  const sort = (searchParams?.sort ?? "featured") as
    | "featured"
    | "price-asc"
    | "price-desc"
    | "name";

  const locale = getServerLocale();

  const [{ items: products, total, hasMore }, occasions, designers, user, sponsors, shops, dbBanners] = await Promise.all([
    listProducts({
      color: activeColor === "all" ? undefined : activeColor,
      occasions: activeOcc ? [activeOcc] : undefined,
      sizes: activeSize ? [activeSize] : undefined,
      designers: activeDesigner ? [activeDesigner] : undefined,
      priceMin: activePriceMin > PRICE_BOUNDS.min ? activePriceMin : undefined,
      priceMax: activePriceMax < PRICE_BOUNDS.max ? activePriceMax : undefined,
      search: search || undefined,
      sort,
      dateFrom: activeDateFrom,
      dateTo: activeDateTo,
    }),
    listOccasions(),
    listDesigners(),
    getCurrentUser().catch(() => null),
    listSponsorShops(8),
    listShops({ featuredFirst: true, limit: 6 }),
    getActiveBanners(),
  ]);

  const savedSet = new Set<string>(user?.savedProductIds ?? []);
  const isLoggedIn = !!user;
  const bannerShops = sponsors.length > 0 ? sponsors : shops;
  const bannerSlides: BannerSlide[] = dbBanners.map((b) => ({
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl,
  }));

  // Locale-aware labels for filter chips
  const occasionOptions = occasions.map((o) => ({
    value: o.key,
    label: locale === "en" ? t(`occasion.${o.key}`, "en") : o.th,
  }));
  const colorOptions = COLORS.map((c) => ({
    value: c,
    label: locale === "en" ? t(`color.${c}`, "en") : COLOR_LABELS_TH[c],
    swatch: COLOR_SWATCH[c],
  }));
  const sizeOptions = SIZES.map((sz) => ({ value: sz, label: sz }));
  const designerOptions = designers.map((d) => ({ value: d, label: d }));

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DopRent",
    url: SITE,
    description:
      "Boutique dress rental marketplace in Bangkok. Browse curated designer pieces and book directly via LINE.",
    areaServed: { "@type": "City", name: "Bangkok" },
  };

  return (
    <div className="home-revamp">
      {/* ======== BANNER CAROUSEL ======== */}
      <section className="bg-bg pt-6">
        <div className="container">
          <BannerCarousel shops={bannerShops} slides={bannerSlides} locale={locale} />
        </div>
      </section>

      {/* ======== OCCASIONS ROW ======== */}
      {occasions.length > 0 && (
        <section className="hr-occasions">
          <div className="container">
            <div className="hr-occ-head">
              <h2 className="hr-occ-title">{t("browse.byOccasion", locale)}</h2>
              <Link href="/" className="hr-occ-more">
                {t("browse.viewAll", locale)}
              </Link>
            </div>
            <div className="hr-occ-row">
              {occasions.map((o) => {
                const label = locale === "en" ? t(`occasion.${o.key}`, "en") : o.th;
                return (
                  <Link
                    key={o.key}
                    href={`/?occasion=${o.key}`}
                    className="hr-occ-chip media-zoom"
                    data-active={activeOcc === o.key ? "true" : undefined}
                  >
                    <span className="hr-occ-tile">
                      <OccasionTile color={o.color_token} />
                    </span>
                    <span className="hr-occ-label">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ======== BROWSE (FILTERS + RESULTS) ======== */}
      <section className="hr-browse">
        <div className="container">
          <div className="browse-grid">
            {/* SIDEBAR — hidden on mobile, sticky on desktop */}
            <aside className="hidden md:block sticky top-[15px] self-start max-h-[calc(100vh-135px)] overflow-y-auto overscroll-contain text-sm filter-sidebar pr-[15px]">
              <BrowseFilters
                q={search}
                color={activeColor === "all" ? null : activeColor}
                occasion={activeOcc ?? null}
                size={activeSize ?? null}
                designer={activeDesigner ?? null}
                priceMin={activePriceMin}
                priceMax={activePriceMax}
                priceBounds={PRICE_BOUNDS}
                occasions={occasionOptions}
                colors={colorOptions}
                sizes={sizeOptions}
                designers={designerOptions}
                locale={locale}
              />
            </aside>

            {/* MAIN */}
            <main>
              <div className="hr-results-bar">
                {/* Location controls — GPS / district / radius chips */}
                <LocationControls locale={locale} />

                {/* Count + sort group, pinned to the right */}
                <div className="hr-results-bar__right">
                  {/* Mobile filter trigger + count */}
                  <div className="flex items-center gap-2">
                    <MobileFilterDrawer
                      q={search}
                      color={activeColor === "all" ? null : activeColor}
                      occasion={activeOcc ?? null}
                      size={activeSize ?? null}
                      designer={activeDesigner ?? null}
                      priceMin={activePriceMin}
                      priceMax={activePriceMax}
                      priceBounds={PRICE_BOUNDS}
                      occasions={occasionOptions}
                      colors={colorOptions}
                      sizes={sizeOptions}
                      designers={designerOptions}
                      locale={locale}
                    />
                    <div className="text-sm text-[var(--ink-2)] whitespace-nowrap">
                      {t("results.found", locale)}{" "}
                      <b className="text-[var(--ink)]">{total}</b>{" "}
                      {t("results.items", locale)}
                    </div>
                  </div>
                  <SortSelect locale={locale} />
                </div>
              </div>

              {products.length === 0 ? (
                <div className="hr-empty">
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                    {t("empty.title", locale)}
                  </h3>
                  <p style={{ fontSize: 14, marginBottom: 18 }}>
                    {t("empty.description", locale)}
                  </p>
                  <Link href="/" className="btn btn-outline">
                    {t("empty.clearAll", locale)}
                  </Link>
                </div>
              ) : (
                <ProductResults
                  key={JSON.stringify(searchParams)}
                  products={products}
                  savedIds={[...savedSet]}
                  isLoggedIn={isLoggedIn}
                  total={total}
                  hasMore={hasMore}
                  locale={locale}
                  searchParams={{
                    q: search || undefined,
                    color: activeColor === "all" ? undefined : activeColor,
                    occasion: activeOcc,
                    size: activeSize,
                    designer: activeDesigner,
                    sort: sort === "featured" ? undefined : sort,
                    dateFrom: activeDateFrom,
                    dateTo: activeDateTo,
                    priceMin: activePriceMin > PRICE_BOUNDS.min ? String(activePriceMin) : undefined,
                    priceMax: activePriceMax < PRICE_BOUNDS.max ? String(activePriceMax) : undefined,
                  }}
                />
              )}
            </main>
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: HR_CSS }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
    </div>
  );
}

const HR_CSS = `
/* ---- Occasions row ---- */
.hr-occasions{
  padding:22px 0 8px;
  border-bottom:1px solid var(--line);
  background:var(--bg);
}
.hr-occ-head{
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:14px;gap:12px;
}
.hr-occ-title{font-size:16px;font-weight:600;margin:0;letter-spacing:-0.01em}
.hr-occ-more{font-size:13px;color:var(--cobalt);white-space:nowrap;text-decoration:none}
.hr-occ-more:hover{text-decoration:underline}

.hr-occ-row{
  display:flex;gap:10px;
  overflow-x:auto;scrollbar-width:none;
  padding-bottom:14px;
}
.hr-occ-row::-webkit-scrollbar{display:none}

.hr-occ-chip{
  display:flex;flex-direction:column;align-items:center;gap:7px;
  flex-shrink:0;cursor:pointer;text-decoration:none;
  transition:opacity .18s var(--ease);
  outline:none;
}
.hr-occ-chip:hover{opacity:.85}
.hr-occ-chip[data-active="true"] .hr-occ-tile{
  outline:2.5px solid var(--accent);outline-offset:2px;
}
.hr-occ-tile{
  width:68px;height:54px;border-radius:10px;overflow:hidden;flex-shrink:0;
  box-shadow:var(--shadow-1);
}
@media(min-width:480px){.hr-occ-tile{width:80px;height:64px}}
.hr-occ-label{
  font-size:12px;font-weight:500;color:var(--ink-2);
  text-align:center;white-space:nowrap;max-width:80px;
  overflow:hidden;text-overflow:ellipsis;
}

/* ---- Browse section ---- */
.hr-browse{
  padding:28px 0 80px;
  background:var(--bg);
}

/* Results bar — sticky on mobile */
.hr-results-bar{
  display:flex;align-items:center;
  margin-bottom:16px;flex-wrap:wrap;gap:8px 12px;
  position:sticky;top:0;z-index:20;
  background:var(--bg);
  padding:10px 0;
  border-bottom:1px solid var(--line);
}
/* Right cluster: count + sort — shrinks but won't break */
.hr-results-bar__right{
  display:flex;align-items:center;gap:8px;
  margin-left:auto;flex-shrink:0;flex-wrap:wrap;
}

/* Empty state */
.hr-empty{
  padding:60px 20px;text-align:center;
  color:var(--ink-3);
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:8px;
}

/* ---- Filter sidebar scrollbar ---- */
.filter-sidebar{
  scrollbar-width:thin;
  scrollbar-color:var(--line) transparent;
}
.filter-sidebar::-webkit-scrollbar{width:4px}
.filter-sidebar::-webkit-scrollbar-track{background:transparent}
.filter-sidebar::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px}
.filter-sidebar::-webkit-scrollbar-thumb:hover{background:var(--ink-3)}


/* ---- Responsive ---- */
@media(max-width:600px){
  .hr-occasions{padding:18px 0 0}
}
`;
