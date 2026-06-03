import Link from "next/link";
import DressCard from "@/components/DressCard";
import { DressArt, BoutiqueCover, OccasionTile } from "@/components/DressArt";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCurrentUser } from "@/lib/auth";
import { getStats, listBoutiques, listDresses, listOccasions } from "@/lib/dresses";

// Force dynamic so DressCard receives correct per-user isLoggedIn / savedSet
// (otherwise Next ISR caches one version and serves it to everyone)
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";
const LINE_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent";

export default async function HomePage() {
  const [dresses, boutiques, occasions, stats, user] = await Promise.all([
    listDresses({ limit: 8 }),
    listBoutiques({ featuredFirst: true, limit: 4 }),
    listOccasions(),
    getStats(),
    getCurrentUser().catch(() => null),
  ]);
  const heroDress = dresses[0];
  const savedSet = new Set(user?.profile.saved_dress_ids ?? []);
  const isLoggedIn = !!user;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DopRent",
    url: SITE,
    description: "Boutique dress rental marketplace in Bangkok. Browse curated designer pieces and book directly via LINE.",
    sameAs: [LINE_URL],
    areaServed: { "@type": "City", name: "Bangkok" },
  };

  return (
    <>
      {/* ========== HERO ==========
          Editorial cover composition: single column, centered, serif display.
          No right-column "dress art" placeholder (real photos aren't ready,
          and a colored gradient block earns nothing). Typography + negative
          space do the work. Inspired by editorial fashion brands (Toteme,
          The Row) where the brand IS the wordmark + a single phrase. */}
      <section
        className="section-pad hero-editorial"
        style={{
          background: "var(--warm)",
          padding: "120px 0 80px",
          position: "relative",
        }}
      >
        {/* Tiny ornamental brand mark — a single rust dot to break the
            symmetry without adding visual noise. */}
        <div
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "var(--accent)",
            margin: "0 auto 32px",
          }}
        />

        <div
          className="shell"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              fontWeight: 500,
              marginBottom: 28,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Bangkok &nbsp;·&nbsp; Boutique Rental
          </div>

          <h1
            className="hero-title display-serif"
            style={{
              marginBottom: 28,
              maxWidth: "14ch",
            }}
          >
            เช่าชุดจาก ร้านที่ไว้ใจได้
          </h1>

          <p
            className="hero-sub"
            style={{
              fontSize: 17,
              color: "var(--ink-2)",
              maxWidth: 460,
              marginBottom: 40,
              lineHeight: 1.6,
            }}
          >
            แคตตาล็อกชุดเช่าจากร้านในกรุงเทพ ทักร้านผ่าน LINE โดยตรง
          </p>

          <Link
            href="/browse"
            className="btn btn-dark btn-lg"
            style={{ padding: "16px 28px", fontSize: 15 }}
          >
            เริ่มเลือกชุด
            <span aria-hidden style={{ marginLeft: 4, fontSize: 16, lineHeight: 1 }}>
              →
            </span>
          </Link>

          <Link
            href="/boutiques"
            style={{
              marginTop: 18,
              fontSize: 13,
              color: "var(--ink-2)",
              borderBottom: "1px solid var(--ink-3)",
              paddingBottom: 1,
            }}
          >
            หรือดูร้านทั้งหมด
          </Link>
        </div>
      </section>

      {/* ========== STATS CAPTION ==========
          Pilot scale shown as a single editorial caption line, no boxes,
          no big numbers. Sits on --warm continuation just below the hero
          so it feels like part of the same composition, not a SaaS metric row. */}
      <div
        style={{
          background: "var(--warm)",
          paddingBottom: 40,
        }}
      >
        <div
          className="shell"
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--ink-3)",
            letterSpacing: "0.06em",
          }}
        >
          <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{stats.boutiques}</span>{" "}
          ร้าน &nbsp;·&nbsp;{" "}
          <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{stats.dresses}</span>{" "}
          ชุด &nbsp;·&nbsp; เริ่มต้น{" "}
          <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>
            ฿{stats.minPrice.toLocaleString()}
          </span>{" "}
          / วัน
        </div>
      </div>

      {/* ========== TRUST ========== */}
      <div
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="shell grid-4"
          style={{
            padding: "18px 0",
            gap: 18,
          }}
        >
          <TrustItem ttl="ตรวจสภาพก่อนส่ง" desc="ทุกชุดเช็คก่อนส่งมือลูกค้า" />
          <TrustItem ttl="ร้านเช่าน่าเชื่อถือ" desc="คัดร้านที่ตรวจสอบแล้ว" />
          <TrustItem ttl="ไม่มีค่าธรรมเนียม" desc="จ่ายราคาเดียวกับร้านบอก" />
          <TrustItem ttl="คุยกับร้านโดยตรง" desc="ทุกขั้นตอนผ่าน LINE chat" />
        </div>
      </div>

      {/* ========== HOW IT WORKS ========== */}
      <section className="section-pad" style={{ background: "var(--bg)", padding: "72px 0" }}>
        <div className="shell">
          <h2
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: 36,
            }}
          >
            วิธีใช้งาน
          </h2>
          <div className="grid-3" style={{ gap: 24 }}>
            <Step n="1" t="เลือกชุด" d="กรองตามโอกาส สี ขนาด ราคา ดีไซเนอร์ ร้านเช่า หาชุดที่ใช่ภายในไม่กี่คลิก" />
            <Step n="2" t="แชต LINE กับร้าน" d="กดปุ่มเปิด LINE ตรงไปคุยกับร้านเช่า ตกลงวัน ราคา การส่ง" />
            <Step n="3" t="รับชุด ใส่ ส่งคืน" d="โอน PromptPay ตรงร้าน รับชุดผ่าน Grab ส่งคืนตามวันที่ตกลง" />
          </div>
        </div>
      </section>

      {/* ========== OCCASIONS ========== */}
      <section className="section-pad" style={{ padding: "60px 0" }}>
        <div className="shell">
          <SectionHead title="เลือกตามโอกาส" linkText="ดูทั้งหมด →" linkHref="/browse" />
          <div className="grid-4" style={{ gap: 12 }}>
            {occasions.map((o) => (
              <Link
                key={o.key}
                href={`/browse?occasion=${o.key}`}
                style={{
                  aspectRatio: "5/4",
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <OccasionTile color={o.color_token} />
                <span
                  style={{
                    position: "absolute",
                    left: 16,
                    bottom: 14,
                    right: 16,
                    color: "var(--on-dark)",
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    zIndex: 2,
                  }}
                >
                  {o.th}
                  <span style={{ display: "block", fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>
                    {o.en}
                  </span>
                </span>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 55%)",
                  }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== JUST IN (NEW) ========== */}
      <section className="section-pad" style={{ background: "var(--warm)", padding: "72px 0" }}>
        <div className="shell">
          <SectionHead title="มาใหม่" linkText={`ดูทั้งหมด ${stats.dresses} ชุด →`} linkHref="/browse" />
          <div className="grid-4" style={{ gap: 20 }}>
            {dresses.slice(0, 8).map((d, i) => (
              <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURED BOUTIQUES ========== */}
      <section className="section-pad" style={{ padding: "60px 0" }}>
        <div className="shell">
          <SectionHead
            title="ร้านเช่าแนะนำ"
            linkText={`ดูร้านเช่าทั้งหมด ${stats.boutiques} ร้าน →`}
            linkHref="/boutiques"
          />
          <div className="grid-2" style={{ gap: 20 }}>
            {boutiques.map((b) => (
              <Link
                key={b.id}
                href={`/boutique/${b.slug}`}
                className="boutique-card"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "border 0.15s",
                }}
              >
                <div className="cover">
                  <BoutiqueCover color={b.cover_color} />
                </div>
                <div style={{ padding: 22, flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                    {b.area_label}
                  </div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      marginBottom: 8,
                      letterSpacing: "-0.01em",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {b.name}
                    {b.verified ? <VerifiedBadge size="sm" /> : null}
                  </h3>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ink-2)",
                      marginBottom: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {b.tag}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-3)",
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    {b.since_year ? <span>เปิดตั้งแต่ {b.since_year}</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
    </>
  );
}

function Stat({ num, lbl }: { num: string; lbl: string }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {num}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>{lbl}</div>
    </div>
  );
}

function TrustItem({ ttl, desc }: { ttl: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink)",
          flexShrink: 0,
          fontSize: 14,
        }}
      >
        ✓
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{ttl}</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        padding: 24,
        borderRadius: 8,
        border: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--ink)",
          color: "var(--on-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        {n}
      </div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{t}</div>
      <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{d}</div>
    </div>
  );
}

// SectionHead component
function SectionHead({
  title,
  linkText,
  linkHref,
}: {
  title: string;
  linkText: string;
  linkHref: string;
}) {
  return (
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
      <h2
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      <Link href={linkHref} style={{ fontSize: 14, color: "var(--ink-2)", padding: "6px 0" }}>
        {linkText}
      </Link>
    </div>
  );
}
