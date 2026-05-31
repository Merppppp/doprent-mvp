import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DressArt } from "@/components/DressArt";
import LineButton from "@/components/LineButton";
import DressCard from "@/components/DressCard";
import SaveButton from "@/components/SaveButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import DateRangePicker from "@/components/DateRangePicker";
import DressAvailabilityCalendar from "@/components/DressAvailabilityCalendar";
import LineMessageCopyBox from "@/components/LineMessageCopyBox";
import { getCurrentUser } from "@/lib/auth";
import {
  getBoutiqueBySlug,
  getDressBySlug,
  listBlackouts,
  listOccasions,
  listSimilarDresses,
} from "@/lib/dresses";
import { COLOR_LABELS_TH } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { id: string }; // route param is actually slug (folder name kept for compat)

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";
const DEFAULT_LINE =
  process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const dress = await getDressBySlug(params.id);
  if (!dress) {
    return { title: "ไม่พบชุด", robots: { index: false, follow: true } };
  }
  const title = dress.designer ? `${dress.name} · ${dress.designer}` : dress.name;
  const description = `${dress.description ?? dress.name} ค่าเช่า ฿${dress.price_per_day.toLocaleString()}/วัน · จองผ่าน LINE กับ ${dress.boutique_name}`;
  const url = `${SITE}/dress/${dress.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "DopRent", locale: "th_TH" },
  };
}

export default async function DressPage({ params }: { params: Params }) {
  const dress = await getDressBySlug(params.id);
  if (!dress) notFound();

  const [occasions, boutique, related, user, blackouts] = await Promise.all([
    listOccasions(),
    getBoutiqueBySlug(slugify(dress.boutique_name)).catch(() => null),
    listSimilarDresses(dress, 4),
    getCurrentUser().catch(() => null),
    listBlackouts(dress.id),
  ]);
  const savedSet = new Set(user?.profile.saved_dress_ids ?? []);
  const isLoggedIn = !!user;
  const isSaved = savedSet.has(dress.id);

  const lineUrl = dress.line_url || boutique?.line_url || DEFAULT_LINE;
  const url = `${SITE}/dress/${dress.slug}`;

  // Get boutique-specific data from DB-fetched record (preferred), or denormalized name
  const boutiqueLine = boutique?.line_url || dress.line_url || DEFAULT_LINE;
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
      seller: { "@type": "Organization", name: dress.boutique_name },
    },
  };

  return (
    <div className="shell" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <div style={{ fontSize: 13, color: "var(--ink-3)", paddingBottom: 8 }}>
        <Link href="/browse">← กลับไปดูทั้งหมด</Link>
      </div>

      <div
        className="detail-grid"
        style={{ padding: "8px 0 60px" }}
      >
        {/* GALLERY */}
        <div>
          <div
            style={{
              aspectRatio: "4/5",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            {dress.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dress.images[0]} alt={dress.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <DressArt color={dress.color} variant={0} />
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "3/4",
                  borderRadius: 6,
                  overflow: "hidden",
                  border: "2px solid transparent",
                }}
              >
                <DressArt color={dress.color} variant={i} />
              </div>
            ))}
            <div
              style={{
                aspectRatio: "3/4",
                borderRadius: 6,
                background: "var(--bg)",
                border: "1px dashed var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "var(--ink-3)",
              }}
            >
              รูปเพิ่มเติม
            </div>
          </div>
        </div>

        {/* INFO */}
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
            <SaveButton
              dressId={dress.id}
              initialSaved={isSaved}
              isLoggedIn={isLoggedIn}
              variant="detail"
            />
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
            <span style={{ fontSize: 24, fontWeight: 600 }}>
              ฿{dress.price_per_day.toLocaleString()}
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

          <p
            style={{
              color: "var(--ink-2)",
              marginBottom: 18,
              lineHeight: 1.65,
              fontSize: 14,
            }}
          >
            {dress.description ?? "—"}
          </p>

          {/* Occasion tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
            {dress.occasions.map((okey) => {
              const o = occasions.find((x) => x.key === okey);
              return (
                <Link
                  key={okey}
                  href={`/browse?occasion=${okey}`}
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

          {/* Boutique mini — primary discoverability hook for the boutique
              behind this listing. The small "ติดต่อร้านสอบถาม" link below it
              is the ONLY general-contact path on this page; all other LINE
              CTAs are gated behind the date picker (so renters commit to
              dates before booking). */}
          {boutiqueSlug ? (
            <Link
              href={`/boutique/${boutiqueSlug}`}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: 12,
                border: "1px solid var(--line)",
                borderRadius: 8,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                <DressArt color={boutique?.cover_color ?? dress.color} variant={0} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {dress.boutique_name}
                  {boutique?.verified ? <VerifiedBadge size="sm" /> : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>
                  {boutique?.area_label ?? ""}
                  {boutique?.since_year ? ` · ตั้งแต่ ${boutique.since_year}` : ""}
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
                marginBottom: 8,
                fontSize: 14,
                color: "var(--ink-2)",
              }}
            >
              ร้าน: <b>{dress.boutique_name}</b>
            </div>
          )}

          {/* Small inline contact link — for renters who want to ask general
              questions ("ชุดยังว่างมั้ย? ส่ง Grab ได้มั้ย?") without committing
              to dates yet. Low visual weight so it doesn't compete with the
              date-picker booking flow below. */}
          <div style={{ marginBottom: 22, paddingLeft: 4 }}>
            <LineButton
              href={isLoggedIn ? boutiqueLine : null}
              label="ติดต่อร้านสอบถาม"
              variant="inline"
              source="detail_inline_ask"
              dressId={dress.id}
              boutiqueId={dress.boutique_id}
              isLoggedIn={isLoggedIn}
              loginNext={`/dress/${dress.slug}`}
            />
          </div>

          {/* Specs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              rowGap: 14,
              columnGap: 24,
              marginBottom: 24,
              paddingTop: 18,
              borderTop: "1px solid var(--line)",
            }}
          >
            <Spec lbl="ขนาด" val={dress.size} />
            <Spec lbl="สี" val={COLOR_LABELS_TH[dress.color]} />
            <Spec lbl="ร้านเช่า" val={dress.boutique_name} />
            <Spec lbl="ดีไซเนอร์" val={dress.designer ?? "—"} />
          </div>

          {/* Availability calendar */}
          <DressAvailabilityCalendar blackouts={blackouts} />

          {/* Date picker (renter). LINE href and pre-filled message are
              omitted entirely for anonymous viewers — they see a login CTA
              instead of the booking button. */}
          <DateRangePicker
            lineUrl={isLoggedIn ? boutiqueLine : ""}
            dressName={dress.name}
            boutiqueName={dress.boutique_name}
            dressPageUrl={url}
            dressImageUrl={dress.images?.[0]}
            pricePerDay={dress.price_per_day}
            priceTiers={dress.price_tiers}
            deposit={dress.deposit}
            blackouts={blackouts}
            dressId={dress.id}
            boutiqueId={dress.boutique_id}
            isLoggedIn={isLoggedIn}
            loginNext={`/dress/${dress.slug}`}
          />

          <LineMessageCopyBox
            dressName={dress.name}
            boutiqueName={dress.boutique_name}
            pricePerDay={dress.price_per_day}
            dressPageUrl={url}
          />

          {/* (CTA stack removed — date picker above is the only booking
              path; Save heart moved up to H1 row; small inline "ติดต่อ
              ร้านสอบถาม" lives under the boutique card. This eliminates
              the 3-stacked-LINE-buttons problem.) */}

          <div
            style={{
              padding: 14,
              background: "var(--bg)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--ink-2)",
              lineHeight: 1.55,
              marginTop: 18,
            }}
          >
            <strong style={{ color: "var(--ink)", display: "block", marginBottom: 4 }}>
              ขั้นตอนต่อจากนี้
            </strong>
            ตกลงวันใส่ ราคา การส่ง คุยกับร้านโดยตรงทาง LINE จ่ายผ่าน PromptPay หรือโอนตรงให้ร้าน DopRent ไม่เก็บเงิน
          </div>
        </div>
      </div>

      {/* RELATED */}
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
          <Link href="/browse" style={{ fontSize: 14, color: "var(--ink-2)" }}>
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="grid-4" style={{ gap: 20 }}>
          {related.filter((d) => d.id !== dress.id).slice(0, 4).map((d, i) => (
            <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      </div>

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
