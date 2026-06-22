import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductArt } from "@/components/ProductArt";
import Gallery from "@/components/Gallery";
import DistanceBadge from "@/components/DistanceBadge";
import ProductCard from "@/components/ProductCard";
import SaveButton from "@/components/SaveButton";
import ShareButton from "@/components/ShareButton";
import ShopSocialLinks from "@/components/ShopSocialLinks";
import VerifiedBadge from "@/components/VerifiedBadge";
import DateRangePicker, { type VariantOption } from "@/components/DateRangePicker";
import { getCurrentUser } from "@/lib/auth";
import {
  getShopBySlug,
  getProductBySlug,
  listBlackouts,
  listOccasions,
  listSimilarProducts,
} from "@/lib/products";
import { hasMultipleRates, startingPerDay } from "@/lib/pricing";
import { COLOR_LABELS_TH, sizeLabel, formatVariantSizes } from "@/lib/types";
import { db } from "@/lib/db";
import {
  resolveEffectivePolicy,
  computeUnavailableDates,
} from "@/lib/booking-policy";
import { parseBusinessHours } from "@/lib/hours";

export const dynamic = "force-dynamic";

type Params = { id: string }; // route param is actually slug (folder name kept for compat)

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const dress = await getProductBySlug(decodeURIComponent(params.id));
  if (!dress) {
    return { title: "ไม่พบชุด", robots: { index: false, follow: true } };
  }
  const title = dress.designer ? `${dress.name} · ${dress.designer}` : dress.name;
  const description = `${dress.description ?? dress.name} ค่าเช่า ฿${dress.price_per_day.toLocaleString()}/วัน · จองผ่าน LINE กับ ${dress.shop_name}`;
  const url = `${SITE}/product/${dress.slug}`;
  // og:image — the product's first photo so link previews (Discord/LINE/FB/X)
  // show the actual item. Image URLs are already absolute (R2/MinIO public URL).
  const ogImage = dress.images?.[0];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "DopRent",
      locale: "th_TH",
      images: ogImage ? [{ url: ogImage, alt: dress.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function DressPage({ params }: { params: Params }) {
  const dress = await getProductBySlug(decodeURIComponent(params.id));
  if (!dress) notFound();

  const [occasions, boutique, related, user, blackouts] = await Promise.all([
    listOccasions(),
    getShopBySlug(slugify(dress.shop_name)).catch(() => null),
    listSimilarProducts(dress, 4),
    getCurrentUser().catch(() => null),
    listBlackouts(dress.id, "all"),
  ]);
  const savedSet = new Set<string>(user?.savedProductIds ?? []);
  const isLoggedIn = !!user;
  const isSaved = savedSet.has(dress.id);

  // Load shop policy + active bookings + shop closed dates for unavailability computation.
  // This requires the product's DB record — we fetch by id which is already resolved.
  const shopWithPolicy = await db.shop.findUnique({
    where: { id: dress.shop_id },
    select: {
      hours: true,
      leadTimeDays: true,
      minRentalDays: true,
      maxRentalDays: true,
      returnWindowDays: true,
      bufferDaysAfter: true,
      closedWeekdays: true,
      closedDates: { select: { date: true } },
    },
  });

  // product policy override columns
  const productPolicyRow = shopWithPolicy
    ? await db.product.findUnique({
        where: { id: dress.id },
        select: {
          policyOverride: true,
          leadTimeDays: true,
          minRentalDays: true,
          maxRentalDays: true,
          returnWindowDays: true,
          bufferDaysAfter: true,
        },
      })
    : null;

  const [activeBookings, productVariants, productPriceTiers] = await Promise.all([
    db.booking.findMany({
      where: {
        productId: dress.id,
        status: { in: ["booking_pending", "waiting_for_payment", "payment_review", "confirmed"] },
      },
      select: { startDate: true, endDate: true, status: true, variantId: true },
    }),
    db.productVariant.findMany({
      where: { productId: dress.id },
      orderBy: [{ size: "asc" }],
      select: { id: true, size: true, quantity: true, pricePerDay: true, deposit: true, available: true, bustCm: true, waistCm: true, lengthCm: true },
    }),
    db.productPriceTier.findMany({
      where: { productId: dress.id },
      orderBy: [{ minDays: "asc" }],
      select: { variantId: true, minDays: true, pricePerDay: true },
    }),
  ]);

  const hasPerVariantPriceTiers = productPriceTiers.some((t) => t.variantId !== null);

  const rangeStart = new Date().toISOString().slice(0, 10);
  // Scan 180 days ahead for the calendar
  const rangeEnd = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 180);
    return d.toISOString().slice(0, 10);
  })();

  const effectivePolicy = shopWithPolicy
    ? resolveEffectivePolicy(
        {
          leadTimeDays: shopWithPolicy.leadTimeDays,
          minRentalDays: shopWithPolicy.minRentalDays,
          maxRentalDays: shopWithPolicy.maxRentalDays,
          returnWindowDays: shopWithPolicy.returnWindowDays,
          bufferDaysAfter: shopWithPolicy.bufferDaysAfter,
          closedWeekdays: shopWithPolicy.closedWeekdays,
        },
        productPolicyRow ?? {
          policyOverride: false,
          leadTimeDays: null,
          minRentalDays: null,
          maxRentalDays: null,
          returnWindowDays: null,
          bufferDaysAfter: null,
        },
      )
    : {
        leadTimeDays: 0,
        minRentalDays: 1,
        maxRentalDays: null,
        returnWindowDays: 2,
        bufferDaysAfter: 2,
        closedWeekdays: [] as number[],
      };

  // Parse business hours to pass today's closing time to the date picker for the closing-soon warning.
  const businessHours = shopWithPolicy ? parseBusinessHours(shopWithPolicy.hours) : null;
  const todayDow = new Date().getDay(); // 0=Sun
  const todayHours = businessHours?.[todayDow] ?? null;
  const shopClosingTime = todayHours?.open ? todayHours.to : null;

  // Separate product-wide blackouts (variantId null) from variant-specific ones
  const productWideBlackouts = blackouts.filter((b) => b.variantId === null).map((b) => b.date);
  const variantBlackoutMap = new Map<string, string[]>();
  for (const b of blackouts) {
    if (b.variantId) {
      const arr = variantBlackoutMap.get(b.variantId) ?? [];
      arr.push(b.date);
      variantBlackoutMap.set(b.variantId, arr);
    }
  }

  const unavailableSet = shopWithPolicy
    ? computeUnavailableDates({
        blackouts: productWideBlackouts,
        shopClosedDates: shopWithPolicy.closedDates.map((d) => d.date.toISOString().slice(0, 10)),
        bookings: activeBookings.map((b) => ({
          startDate: b.startDate,
          endDate: b.endDate,
          status: b.status,
        })),
        effectivePolicy,
        rangeStart,
        rangeEnd,
      })
    : new Set<string>();

  const unavailable = Array.from(unavailableSet).sort();

  // Build per-variant unavailable date sets (variant-aware stock check).
  // Product-wide blackouts + variant-specific blackouts + closed days are common base.
  // Per-variant: additionally block dates where that variant's booking count >= quantity.
  const ACTIVE_STATUSES_DETAIL = new Set(["booking_pending", "waiting_for_payment", "payment_review", "confirmed", "renting"]);

  const variantOptions: VariantOption[] = productVariants.map((v) => {
    const variantBookings = activeBookings.filter(
      (b) => ACTIVE_STATUSES_DETAIL.has(b.status) && (b.variantId === v.id || b.variantId === null),
    );

    const variantSpecificBlackouts = [
      ...productWideBlackouts,
      ...(variantBlackoutMap.get(v.id) ?? []),
    ];

    const variantUnavailableSet = computeUnavailableDates({
      blackouts: variantSpecificBlackouts,
      shopClosedDates: shopWithPolicy?.closedDates.map((d) => d.date.toISOString().slice(0, 10)) ?? [],
      bookings: variantBookings.map((b) => ({ startDate: b.startDate, endDate: b.endDate, status: b.status })),
      effectivePolicy,
      rangeStart,
      rangeEnd,
      quantity: v.quantity,
    });

    return {
      id: v.id,
      size: v.size,
      quantity: v.quantity,
      pricePerDay: v.pricePerDay,
      deposit: v.deposit,
      available: v.available,
      // Only include dates that are NOT already in the product-level unavailableSet
      // (product-level dates are shown at the calendar level; variant-specific ones overlay)
      unavailable: Array.from(variantUnavailableSet)
        .filter((d) => !unavailableSet.has(d))
        .sort(),
    };
  });

  const url = `${SITE}/product/${dress.slug}`;

  // Get boutique-specific data from DB-fetched record (preferred), or denormalized name
  const boutiqueSlug = boutique?.slug ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: dress.name,
    description: dress.description ?? dress.name,
    brand: { "@type": "Brand", name: dress.designer ?? "DopRent" },
    color: dress.color,
    size: dress.size,
    url,
    offers: {
      "@type": "Offer",
      priceCurrency: "THB",
      price: dress.price_per_day,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: dress.price_per_day,
        priceCurrency: "THB",
        unitText: "DAY",
      },
      availability: dress.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: dress.shop_name },
    },
  };

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <div style={{ fontSize: 13, color: "var(--ink-3)", paddingBottom: 8 }}>
        <Link href="/">← กลับไปดูทั้งหมด</Link>
      </div>

      {/* HERO — sticky gallery (left) + compact booking essentials (right).
          Everything verbose/reference (description, specs, price tiers, size
          table, how-to) moved to full-width sections BELOW so the right rail
          stays short and the two columns no longer become wildly uneven. */}
      <div
        className="detail-grid"
        style={{ padding: "8px 0 8px" }}
      >
        {/* GALLERY — real images get the fullscreen lightbox; listings with no
            uploaded photos fall back to the generated DressArt placeholder. */}
        <div className="detail-gallery">
          {dress.images?.length ? (
            <Gallery images={dress.images} alt={dress.name} />
          ) : (
            <div
              style={{
                aspectRatio: "4/5",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <ProductArt color={dress.color ?? "rose"} variant={0} />
            </div>
          )}
        </div>

        {/* BOOKING ESSENTIALS (compact) */}
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8, fontWeight: 500 }}>
            {dress.designer || "—"}
          </div>
          {dress.tag_code ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 18 }}>
              รหัสชุด: {dress.tag_code}
            </div>
          ) : null}
          {/* H1 + Save heart in a row — moved up here from the bottom CTA
              section so it doesn't compete with the date-picker booking
              button. Standard ecommerce pattern (heart-near-title). */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h1 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2, flex: 1 }}>
              {dress.name}
            </h1>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <ShareButton url={url} title={dress.name} />
              <SaveButton
                productId={dress.id}
                initialSaved={isSaved}
                isLoggedIn={isLoggedIn}
                variant="detail"
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 22,
              paddingBottom: 22,
              borderBottom: "1px solid var(--line)",
              flexWrap: "wrap",
            }}
          >
            {hasMultipleRates(dress.price_tiers) ? (
              <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}>เริ่มต้น</span>
            ) : null}
            <span style={{ fontSize: 24, fontWeight: 600 }}>
              ฿{startingPerDay(dress.price_tiers, dress.price_per_day).toLocaleString()}
            </span>
            <span style={{ color: "var(--ink-3)", fontSize: 14 }}>/วัน</span>
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                marginLeft: 12,
                padding: "4px 8px",
                background: "var(--bg)",
                borderRadius: 4,
              }}
            >
              มัดจำ ฿{dress.deposit.toLocaleString()}
            </span>
          </div>

          {/* Boutique mini — primary discoverability hook for the boutique
              behind this listing. Kept in the hero so renters see who they're
              booking from right next to the date picker. */}
          {boutiqueSlug ? (
            <Link
              href={`/shop/${boutiqueSlug}`}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: 12,
                border: "1px solid var(--line)",
                borderRadius: 8,
                marginBottom: 18,
                cursor: "pointer",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                <ProductArt color={boutique?.cover_color ?? dress.color ?? "rose"} variant={0} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {dress.shop_name}
                  {boutique?.verified ? <VerifiedBadge size="sm" /> : null}
                  {boutique?.is_open && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 6,
                        background: "var(--success-soft)",
                        color: "var(--success)",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--success)",
                        }}
                      />
                      Online
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>
                    {boutique?.area_label ?? ""}
                    {boutique?.since_year ? ` · ตั้งแต่ ${boutique.since_year}` : ""}
                  </span>
                  <DistanceBadge areaKey={boutique?.area_key} />
                </div>
              </div>
              <div style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 18 }}>→</div>
            </Link>
          ) : (
            <div
              style={{
                padding: 12,
                border: "1px solid var(--line)",
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 14,
                color: "var(--ink-2)",
              }}
            >
              ร้าน: <b>{dress.shop_name}</b>
            </div>
          )}

          {/* Boutique social channels — clickable icons sit just below the
              shop card (outside the card's <Link> to avoid nested anchors). */}
          {boutique && (boutique.instagram || boutique.facebook || boutique.twitter || boutique.tiktok) ? (
            <div style={{ marginTop: -8, marginBottom: 18 }}>
              <ShopSocialLinks
                instagram={boutique.instagram}
                facebook={boutique.facebook}
                twitter={boutique.twitter}
                tiktok={boutique.tiktok}
                size={34}
              />
            </div>
          ) : null}

          {/* Date picker (renter). LINE href and pre-filled message are
              omitted entirely for anonymous viewers — they see a login CTA
              instead of the booking button. */}
          <DateRangePicker
            dressName={dress.name}
            boutiqueName={dress.shop_name}
            dressPageUrl={url}
            dressImageUrl={dress.images?.[0]}
            pricePerDay={dress.price_per_day}
            priceTiers={dress.price_tiers}
            deposit={dress.deposit}
            blackouts={productWideBlackouts}
            unavailable={unavailable}
            leadTimeDays={effectivePolicy.leadTimeDays}
            minRentalDays={effectivePolicy.minRentalDays}
            maxRentalDays={effectivePolicy.maxRentalDays}
            productId={dress.id}
            shopId={dress.shop_id}
            dressTagCode={dress.tag_code}
            isLoggedIn={isLoggedIn}
            loginNext={`/product/${dress.slug}`}
            variants={variantOptions.length > 0 ? variantOptions : undefined}
            shopClosingTime={shopClosingTime}
            shopIsOpen={boutique?.is_open ?? null}
          />
        </div>
      </div>

      {/* FULL-WIDTH DETAIL SECTIONS — the verbose reference content now flows
          across the page width instead of stacking in the narrow right rail. */}
      <div className="detail-sections" style={{ paddingBottom: 40 }}>
        {/* Description + occasion tags */}
        <section>
          <div className="detail-section-title">รายละเอียด</div>
          <p style={{ color: "var(--ink-2)", lineHeight: 1.7, fontSize: 14, marginBottom: 16 }}>
            {dress.description ?? "—"}
          </p>
          {dress.occasions.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {dress.occasions.map((okey) => {
                const o = occasions.find((x) => x.key === okey);
                return (
                  <Link
                    key={okey}
                    href={`/?occasion=${okey}`}
                    style={{
                      padding: "4px 10px",
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "var(--ink-2)",
                    }}
                  >
                    {o ? o.th : okey}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Specs */}
        <section>
          <div className="detail-section-title">ข้อมูลชุด</div>
          <div className="detail-specs-grid">

            <Spec lbl="ขนาด" val={formatVariantSizes(productVariants, dress.size)} />
            <Spec lbl="สี" val={dress.color ? COLOR_LABELS_TH[dress.color] : "—"} />
            <Spec lbl="ร้านเช่า" val={dress.shop_name} />
            <Spec lbl="แบรนด์" val={dress.designer ?? "—"} />
          </div>
        </section>

        {/* Price tiers display */}
        {hasPerVariantPriceTiers ? (
          <section>
            <div className="detail-section-title">ราคาต่อไซซ์</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 520 }}>
              {productVariants.filter((v) => v.available).map((v) => {
                const vTiers = productPriceTiers.filter((t) => t.variantId === v.id).sort((a, b) => a.minDays - b.minDays);
                const startingPrice = vTiers.length > 0 ? Math.min(...vTiers.map((t) => t.pricePerDay)) : v.pricePerDay;
                return (
                  <div key={v.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
                    <div style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--line)", fontWeight: 600, textAlign: "center" }}>
                      {sizeLabel(v.size)}
                    </div>
                    <div style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--line)" }}>
                      เริ่มต้น ฿{startingPrice.toLocaleString()}/วัน
                      {vTiers.length > 1 ? ` (${vTiers.length} ช่วงราคา)` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : dress.price_tiers && dress.price_tiers.length > 0 ? (
          <section>
            <div className="detail-section-title">แพ็กเกจราคา</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 520 }}>
              {dress.price_tiers.map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 6, background: "var(--surface)", border: "1px solid var(--line)" }}>
                    {t.min}{t.max ? `–${t.max}` : "+"} วัน
                  </div>
                  <div style={{ padding: 10, borderRadius: 6, background: "var(--surface)", border: "1px solid var(--line)", textAlign: "right", fontWeight: 600 }}>
                    ฿{(t.per_day ?? 0).toLocaleString()}/วัน
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Measurement guide — shown only if at least one variant has measurements */}
        {productVariants.some((v) => v.bustCm || v.waistCm || v.lengthCm) && (
          <section>
            <div className="detail-section-title">ตารางขนาด</div>
            <div style={{ overflowX: "auto", maxWidth: 560 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["ไซซ์", "รอบอก (ซม.)", "รอบเอว (ซม.)", "ความยาว (ซม.)"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 10px", textAlign: "left", fontWeight: 600,
                          color: "var(--ink-2)", borderBottom: "1px solid var(--line)",
                          whiteSpace: "nowrap",
                        }}
                      >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productVariants
                    .filter((v) => v.available)
                    .map((v) => (
                      <tr key={v.id}>
                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>{sizeLabel(v.size)}</td>
                        <td style={{ padding: "6px 10px", color: "var(--ink-2)" }}>{v.bustCm ?? "—"}</td>
                        <td style={{ padding: "6px 10px", color: "var(--ink-2)" }}>{v.waistCm ?? "—"}</td>
                        <td style={{ padding: "6px 10px", color: "var(--ink-2)" }}>{v.lengthCm ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* RELATED — content-based similarity: occasion overlap, color, size,
          price band, designer, boutique (see listSimilarDresses). Hidden
          entirely if the catalogue can't yield even one candidate, so the
          section header doesn't dangle over an empty grid. */}
      {related.length > 0 ? (
        <div style={{ paddingTop: 48, paddingBottom: 60, borderTop: "1px solid var(--line)" }}>
          <div
            className="section-head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              marginBottom: 28,
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>ชุดที่คล้ายกัน</h2>
            <Link href="/" style={{ fontSize: 14, color: "var(--ink-2)" }}>
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="grid-4" style={{ gap: 20 }}>
            {related.map((d, i) => (
              <ProductCard key={d.id} product={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </div>
      ) : null}

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

function Spec({ lbl, val }: { lbl: string; val: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, letterSpacing: "0.02em" }}>
        {lbl}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500 }}>{val}</div>
    </div>
  );
}

/** Best-effort slug from a boutique display name (fallback only — DB has real slugs). */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
