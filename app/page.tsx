import Link from "next/link";
import DressCard from "@/components/DressCard";
import CountUp from "@/components/CountUp";
import DistanceBadge from "@/components/DistanceBadge";
import { BoutiqueCover, OccasionTile } from "@/components/DressArt";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCurrentUser } from "@/lib/auth";
import { getStats, listBoutiques, listDresses, listOccasions, listSponsorBoutiques } from "@/lib/dresses";

// Force dynamic so DressCard receives correct per-user isLoggedIn / savedSet
// (otherwise Next ISR caches one version and serves it to everyone)
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";
const LINE_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent";

export default async function HomePage() {
  const [dresses, boutiques, sponsors, occasions, stats, user] = await Promise.all([
    listDresses({ limit: 8 }),
    listBoutiques({ featuredFirst: true, limit: 4 }),
    listSponsorBoutiques(8),
    listOccasions(),
    getStats(),
    getCurrentUser().catch(() => null),
  ]);
  // Paid (boost/featured) shops fill the marquee as a "ร้านสนับสนุน" ad slot.
  // Fall back to the verified-shop strip when nobody is on a paid plan yet.
  const sponsorStrip = sponsors.length > 0;
  const marqueeShops = sponsorStrip ? sponsors : boutiques;
  const heroDress = dresses[0];
  const heroImg =
    heroDress && Array.isArray(heroDress.images) && heroDress.images.length > 0
      ? heroDress.images[0]
      : null;
  const savedSet = new Set(user?.profile.saved_dress_ids ?? []);
  const isLoggedIn = !!user;
  const teaserCount = Math.max(stats.dresses - dresses.length, 0);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DopRent",
    url: SITE,
    description:
      "Boutique dress rental marketplace in Bangkok. Browse curated designer pieces and book directly via LINE.",
    sameAs: [LINE_URL],
    areaServed: { "@type": "City", name: "Bangkok" },
  };

  return (
    <div className="home26">
      {/* ========== HERO ========== */}
      <section className="h26-hero">
        <div aria-hidden className="h26-glow" id="h26glow" />
        <div className="shell h26-grid">
          <div>
            <span className="h26-eyebrow rise rise-1">
              <span className="d" /> ร้านเช่าคัดมาแล้ว ตรวจสอบจริงทุกร้าน
            </span>
            <h1 className="h26-h1 display-serif rise rise-2">
              เช่าชุดงานสวย<br />จากร้านที่ <em>ตรวจสอบแล้ว</em>
            </h1>
            <p className="h26-lead rise rise-3">
              แคตตาล็อกชุดเช่าจากร้านในกรุงเทพฯ ดูสภาพชุดจริงก่อนตัดสินใจ
              คุยและตกลงวัน ราคา การส่ง ตรงกับร้านผ่าน LINE
            </p>
            <div className="h26-cta rise rise-4">
              <Link href="/browse" className="btn btn-primary btn-lg" style={{ padding: "14px 26px", fontSize: 15 }}>
                เริ่มเลือกชุด
                <span aria-hidden style={{ marginLeft: 2 }}>→</span>
              </Link>
              <Link href="/boutiques" className="btn btn-ghost btn-lg" style={{ padding: "14px 24px", fontSize: 15 }}>
                ดูร้านเช่า
              </Link>
            </div>
            <div className="h26-trust rise rise-5">
              <span>
                <b><CountUp value={stats.boutiques} /></b>
                <small>ร้านเช่าคัดสรร</small>
              </span>
              <span>
                <b><CountUp value={stats.dresses} /></b>
                <small>ชุดพร้อมเช่า</small>
              </span>
              <span>
                <b><CountUp value={stats.minPrice} prefix="฿" /></b>
                <small>เริ่มต้น / วัน</small>
              </span>
            </div>
          </div>

          <div className="h26-stack rise rise-3" id="h26stack">
            <div className="h26-frame h26-f1" data-depth="14">
              {heroImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImg} alt={heroDress?.name ?? ""} loading="eager" />
              ) : null}
            </div>
            <div className="h26-frame h26-f3" data-depth="26" />
            <div className="h26-frame h26-f2" data-depth="20">
              <span className="h26-vchip">
                <span className="ck">
                  <svg viewBox="0 0 24 24"><polyline points="4,12 10,18 20,6" /></svg>
                </span>
                ร้านนี้ตรวจสอบแล้ว
              </span>
            </div>
            {teaserCount > 0 ? (
              <div className="h26-peek" data-depth="34">
                <span className="sp" /> อีก <b>{teaserCount.toLocaleString()}+</b> ชุดรอให้สำรวจ
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ========== SPONSOR / VERIFIED MARQUEE (paid shops first) ========== */}
      {marqueeShops.length > 0 ? (
        <div className="h26-marquee" aria-hidden>
          <div className="track">
            {[...marqueeShops, ...marqueeShops, ...marqueeShops].map((b, i) => (
              <span className="item" key={`${b.id}-${i}`}>
                {b.verified ? (
                  <span className="v">
                    <svg viewBox="0 0 24 24"><polyline points="4,12 10,18 20,6" /></svg>
                  </span>
                ) : null}
                {b.name}
                <span className="loc">· {b.area_label}</span>
                {sponsorStrip ? <span className="spon">ร้านสนับสนุน</span> : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ========== TRUST PILLARS ========== */}
      <section className="h26-pillars" id="trust">
        <div className="shell">
          <div className="h26-phead reveal-stagger">
            <h2>เช่ากับร้านที่ไม่รู้จักก็อุ่นใจได้</h2>
            <p>DopRent คัดร้าน ตรวจสภาพ และให้คุณคุยตรงกับร้านทุกขั้นตอน</p>
          </div>
          <div className="h26-prow reveal-stagger">
            <Pillar
              n={1}
              t="ร้านเช่าคัดมาแล้ว"
              d="คัดเฉพาะร้านที่ตรวจสอบข้อมูลและรีวิวจริง ร้านที่ผ่านการยืนยันมีป้ายกำกับชัดเจน"
            />
            <Pillar
              n={2}
              t="ดูสภาพก่อนตัดสินใจ"
              d="รูปและรายละเอียดชุดจากร้านโดยตรง สอบถามตำหนิ ขนาด เนื้อผ้า ได้ก่อนจอง"
            />
            <Pillar
              n={3}
              t="คุยกับร้านตรงผ่าน LINE"
              d="ตกลงวันรับ–คืน ราคา และวิธีจัดส่งกับร้านเอง ไม่มีคนกลางมาเพิ่มค่าธรรมเนียม"
            />
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="section-pad" style={{ background: "var(--surface)", padding: "72px 0", borderTop: "1px solid var(--line)" }}>
        <div className="shell">
          <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 36 }}>
            เช่าจบใน 3 ขั้นตอน
          </h2>
          <div className="grid-3 reveal-stagger" style={{ gap: 24 }}>
            <Step n="1" t="เลือกชุด เลือกวัน" d="กรองตามโอกาส สี ขนาด ราคา ร้านเช่า หาชุดที่ใช่ภายในไม่กี่คลิก" />
            <Step n="2" t="แชต LINE กับร้าน" d="กดปุ่มเปิด LINE ตรงไปคุยกับร้าน ตกลงวัน ราคา และการส่ง" />
            <Step n="3" t="รับชุด ใส่ ส่งคืน" d="โอน PromptPay ตรงร้าน รับชุดผ่าน Grab ส่งคืนตามวันที่ตกลง" />
          </div>
        </div>
      </section>

      {/* ========== OCCASIONS ========== */}
      <section className="section-pad" style={{ padding: "60px 0" }}>
        <div className="shell">
          <SectionHead title="เลือกตามโอกาส" linkText="ดูทั้งหมด →" linkHref="/browse" />
          <div className="grid-4 reveal-stagger" style={{ gap: 12 }}>
            {occasions.map((o) => (
              <Link
                key={o.key}
                href={`/browse?occasion=${o.key}`}
                className="media-zoom hover-lift"
                style={{ aspectRatio: "5/4", borderRadius: 12, overflow: "hidden", position: "relative", cursor: "pointer" }}
              >
                <OccasionTile color={o.color_token} />
                <span style={{ position: "absolute", left: 16, bottom: 14, right: 16, color: "var(--on-dark)", fontSize: 16, fontWeight: 600, lineHeight: 1.1, zIndex: 2 }}>
                  {o.th}
                  <span style={{ display: "block", fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>{o.en}</span>
                </span>
                <span style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 55%)" }} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== JUST IN (NEW) ========== */}
      <section className="section-pad" style={{ background: "var(--warm)", padding: "72px 0" }}>
        <div className="shell">
          <SectionHead title="ชุดมาใหม่" linkText={`ดูทั้งหมด ${stats.dresses} ชุด →`} linkHref="/browse" />
          <p className="h26-fresh reveal-stagger">
            <span className="live" /> อัปเดตจากร้านเป็นประจำ · เลือกก่อนชุดที่ถูกใจถูกจองไปก่อน
          </p>
          <div className="grid-4 reveal-stagger" style={{ gap: 20 }}>
            {dresses.slice(0, 7).map((d, i) => (
              <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
            ))}
            {/* curiosity hook — locked teaser into the full catalog */}
            <Link href="/browse" className="h26-lock hover-lift" aria-label="ดูชุดทั้งหมด">
              <div className="bg" />
              <div className="ov">
                <span className="lk">
                  <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                </span>
                <span className="big">+{teaserCount > 0 ? teaserCount.toLocaleString() : stats.dresses.toLocaleString()}</span>
                <span className="sm">ชุดในแคตตาล็อก</span>
                <span className="unlock">แตะดูทั้งหมด →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ========== FEATURED BOUTIQUES ========== */}
      <section className="section-pad" style={{ padding: "60px 0" }}>
        <div className="shell">
          <SectionHead title="ร้านเช่าแนะนำ" linkText={`ดูร้านเช่าทั้งหมด ${stats.boutiques} ร้าน →`} linkHref="/boutiques" />
          <div className="grid-2 reveal-stagger" style={{ gap: 20 }}>
            {boutiques.map((b) => (
              <Link key={b.id} href={`/boutique/${b.slug}`} className="boutique-card card-surface" style={{ cursor: "pointer" }}>
                <div className="cover media">
                  <BoutiqueCover color={b.cover_color} />
                </div>
                <div style={{ padding: 22, flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>{b.area_label}</span>
                    <DistanceBadge areaKey={b.area_key} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {b.name}
                    {b.verified ? <VerifiedBadge size="sm" /> : null}
                  </h3>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>{b.tag}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", gap: 12 }}>
                    {b.since_year ? <span>เปิดตั้งแต่ {b.since_year}</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="section-pad" style={{ textAlign: "center", padding: "84px 0" }}>
        <div className="shell">
          <h2 className="display-serif" style={{ fontSize: "clamp(30px,4vw,46px)", marginBottom: 16 }}>
            ชุดที่ใช่ <em style={{ fontStyle: "italic", color: "var(--accent)" }}>รออยู่</em> แล้ว
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 17, maxWidth: "46ch", margin: "0 auto 28px" }}>
            เลือกจากชุดงานกว่า {stats.dresses} ตัว จากร้านเช่าที่คัดมาแล้วทั่วกรุงเทพฯ
          </p>
          <Link href="/browse" className="btn btn-primary btn-lg" style={{ padding: "15px 30px", fontSize: 16 }}>
            เริ่มเลือกชุด <span aria-hidden style={{ marginLeft: 2 }}>→</span>
          </Link>
        </div>
      </section>

      {/* ===== scoped styles for the refreshed home (teal tokens, reversible) ===== */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: HOME_CSS }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: HOME_JS }}
      />
    </div>
  );
}

function Pillar({ n, t, d }: { n: number; t: string; d: string }) {
  return (
    <div className="h26-pillar">
      <div className="pic">{n}</div>
      <h3>{t}</h3>
      <p>{d}</p>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="card-surface hover-lift" style={{ padding: 24 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
        {n}
      </div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{t}</div>
      <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{d}</div>
    </div>
  );
}

function SectionHead({ title, linkText, linkHref }: { title: string; linkText: string; linkHref: string }) {
  return (
    <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20, gap: 12 }}>
      <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{title}</h2>
      <Link href={linkHref} style={{ fontSize: 14, color: "var(--cobalt)", padding: "6px 0", whiteSpace: "nowrap" }}>
        {linkText}
      </Link>
    </div>
  );
}

const HOME_CSS = `
.home26 .h26-hero{position:relative;overflow:hidden;padding:84px 0 60px;background:var(--bg)}
.home26 .h26-glow{position:absolute;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,color-mix(in oklch,var(--accent) 16%,transparent),transparent 68%);filter:blur(22px);pointer-events:none;z-index:0;left:-9999px;top:-9999px;transform:translate(-50%,-50%);opacity:0;transition:opacity .6s var(--ease)}
.home26 .h26-grid{position:relative;z-index:1;display:grid;grid-template-columns:1.05fr .95fr;gap:60px;align-items:center}
.home26 .h26-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:13.5px;font-weight:500;color:var(--accent-2);background:var(--accent-soft);padding:7px 15px;border-radius:999px;margin-bottom:24px}
.home26 .h26-eyebrow .d{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 0 color-mix(in oklch,var(--accent) 40%,transparent);animation:h26pulse 2.4s var(--ease) infinite}
@keyframes h26pulse{0%{box-shadow:0 0 0 0 color-mix(in oklch,var(--accent) 40%,transparent)}70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
.home26 .h26-h1{font-size:clamp(36px,5vw,60px);font-weight:600;line-height:1.12;letter-spacing:-0.01em;margin-bottom:20px}
.home26 .h26-h1 em{font-style:italic;color:var(--accent)}
.home26 .h26-lead{font-size:18px;color:var(--ink-2);max-width:46ch;margin-bottom:30px;line-height:1.6}
.home26 .h26-cta{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:32px}
.home26 .h26-trust{display:flex;gap:30px;flex-wrap:wrap}
.home26 .h26-trust span{display:flex;flex-direction:column;line-height:1.25}
.home26 .h26-trust b{font-family:"Bai Jamjuree",serif;font-size:24px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums}
.home26 .h26-trust small{font-size:13px;color:var(--ink-3)}
.home26 .h26-stack{position:relative;height:460px}
.home26 .h26-frame{position:absolute;border-radius:18px;overflow:hidden;box-shadow:0 22px 50px -24px oklch(0.3 0.05 80/.4);transition:transform .5s var(--ease);will-change:transform}
.home26 .h26-frame img{width:100%;height:100%;object-fit:cover}
.home26 .h26-frame::after{content:"";position:absolute;inset:0;background:linear-gradient(160deg,transparent 45%,oklch(0.2 0.04 80/.16))}
.home26 .h26-f1{width:62%;height:84%;top:0;right:0;background:linear-gradient(150deg,oklch(0.6 0.08 168),oklch(0.4 0.07 168))}
.home26 .h26-f2{width:48%;height:60%;bottom:0;left:0;background:linear-gradient(150deg,var(--blush),oklch(0.82 0.06 35));z-index:2}
.home26 .h26-f3{width:30%;height:34%;top:14%;left:6%;background:linear-gradient(150deg,var(--gold),oklch(0.68 0.09 78))}
.home26 .h26-vchip{position:absolute;bottom:16px;left:16px;z-index:5;display:flex;align-items:center;gap:9px;background:var(--bg);padding:9px 14px 9px 11px;border-radius:999px;font-size:13px;font-weight:500;box-shadow:0 8px 24px -10px oklch(0.3 0.05 80/.5)}
.home26 .h26-vchip .ck{width:21px;height:21px;border-radius:50%;background:var(--accent);display:grid;place-items:center;flex-shrink:0}
.home26 .h26-vchip .ck svg{width:11px;height:11px;stroke:var(--accent-ink);stroke-width:3;fill:none}
.home26 .h26-peek{position:absolute;top:4px;right:-6px;z-index:6;display:flex;align-items:center;gap:8px;background:var(--ink);color:var(--on-dark);padding:9px 15px;border-radius:999px;font-size:13px;font-weight:500;box-shadow:0 12px 30px -12px oklch(0.3 0.05 80/.6);animation:h26floaty 4.6s var(--ease) infinite}
.home26 .h26-peek b{font-family:"Bai Jamjuree";font-variant-numeric:tabular-nums}
.home26 .h26-peek .sp{width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 3px color-mix(in oklch,var(--gold) 35%,transparent)}
@keyframes h26floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.home26 .h26-marquee{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface);overflow:hidden;padding:13px 0}
.home26 .h26-marquee .track{display:flex;gap:38px;white-space:nowrap;width:max-content;animation:h26scroll 30s linear infinite}
.home26 .h26-marquee:hover .track{animation-play-state:paused}
.home26 .h26-marquee .item{display:inline-flex;align-items:center;gap:8px;font-family:"Bai Jamjuree";font-weight:500;font-size:14.5px;color:var(--ink-2)}
.home26 .h26-marquee .item .loc{color:var(--ink-3);font-weight:400;font-family:"Anuphan"}
.home26 .h26-marquee .item .v{width:16px;height:16px;border-radius:50%;background:var(--accent);display:grid;place-items:center}
.home26 .h26-marquee .item .v svg{width:9px;height:9px;stroke:var(--accent-ink);stroke-width:3.5;fill:none}
.home26 .h26-marquee .item .spon{font-family:"Anuphan";font-weight:500;font-size:10.5px;letter-spacing:.02em;color:var(--gold);background:color-mix(in oklch,var(--gold) 16%,transparent);border:1px solid color-mix(in oklch,var(--gold) 34%,transparent);padding:1px 7px;border-radius:999px;margin-left:2px}
@keyframes h26scroll{to{transform:translateX(-33.333%)}}
.home26 .h26-pillars{padding:66px 0;background:var(--bg)}
.home26 .h26-phead{max-width:56ch;margin:0 auto 44px;text-align:center}
.home26 .h26-phead h2{font-size:clamp(26px,3.4vw,38px);font-weight:600;margin-bottom:12px}
.home26 .h26-phead p{color:var(--ink-2);font-size:16.5px}
.home26 .h26-prow{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
.home26 .h26-pillar{padding:0 34px;position:relative}
.home26 .h26-pillar + .h26-pillar{border-left:1px solid var(--line)}
.home26 .h26-pillar .pic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;margin-bottom:16px;background:var(--accent-soft);color:var(--accent-2);font-family:"Bai Jamjuree";font-weight:600;font-size:17px}
.home26 .h26-pillar h3{font-size:20px;font-weight:600;margin-bottom:9px}
.home26 .h26-pillar p{color:var(--ink-2);font-size:15px;line-height:1.6}
.home26 .h26-fresh{display:flex;align-items:center;gap:9px;font-size:14.5px;color:var(--ink-2);margin:-6px 0 24px}
.home26 .h26-fresh .live{width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 0 0 color-mix(in oklch,var(--success) 50%,transparent);animation:h26pulse2 2s var(--ease) infinite}
@keyframes h26pulse2{0%{box-shadow:0 0 0 0 color-mix(in oklch,var(--success) 50%,transparent)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
.home26 .h26-lock{position:relative;border-radius:12px;overflow:hidden;background:var(--surface);display:block;aspect-ratio:auto;min-height:100%;cursor:pointer}
.home26 .h26-lock .bg{position:absolute;inset:0;background:linear-gradient(155deg,oklch(0.6 0.08 168),oklch(0.4 0.07 168));filter:blur(2px);transform:scale(1.05);transition:filter .5s var(--ease),transform .7s var(--ease)}
.home26 .h26-lock:hover .bg{filter:blur(0px);transform:scale(1.08)}
.home26 .h26-lock::after{content:"";position:absolute;inset:0;background:oklch(0.235 0.018 70/.4)}
.home26 .h26-lock .ov{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:18px;color:var(--on-dark)}
.home26 .h26-lock .lk{width:40px;height:40px;border-radius:50%;background:color-mix(in oklch,var(--on-dark) 20%,transparent);backdrop-filter:blur(4px);display:grid;place-items:center;margin-bottom:13px;transition:transform .4s var(--ease)}
.home26 .h26-lock:hover .lk{transform:scale(1.08)}
.home26 .h26-lock .lk svg{width:18px;height:18px;stroke:var(--on-dark);stroke-width:2;fill:none}
.home26 .h26-lock .big{font-family:"Bai Jamjuree";font-size:26px;font-weight:600;line-height:1.1;font-variant-numeric:tabular-nums}
.home26 .h26-lock .sm{font-size:13px;opacity:.9;margin-bottom:13px}
.home26 .h26-lock .unlock{display:inline-flex;align-items:center;gap:6px;background:var(--bg);color:var(--ink);font-size:13.5px;font-weight:500;padding:8px 16px;border-radius:999px}
@media (max-width:900px){
  .home26 .h26-grid{grid-template-columns:1fr;gap:36px}
  .home26 .h26-stack{height:360px;order:-1}
  .home26 .h26-prow{grid-template-columns:1fr}
  .home26 .h26-pillar{padding:24px 0}
  .home26 .h26-pillar + .h26-pillar{border-left:none;border-top:1px solid var(--line)}
}
@media (max-width:600px){
  .home26 .h26-hero{padding:56px 0 44px}
  .home26 .h26-trust{gap:22px}
}
@media (prefers-reduced-motion:reduce){
  .home26 .h26-eyebrow .d,.home26 .h26-peek,.home26 .h26-fresh .live{animation:none}
  .home26 .h26-marquee .track{animation:none}
  .home26 .h26-frame{transition:none}
}
`;

const HOME_JS = `(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  // hero stat count-up now handled by the <CountUp> client component.
  // hero parallax + spotlight (fine pointer, motion ok)
  if(!reduce && window.matchMedia && matchMedia('(pointer:fine)').matches){
    var hero=document.querySelector('.home26 .h26-hero'), glow=document.getElementById('h26glow'), stack=document.getElementById('h26stack');
    if(hero&&stack){
      var frames=[].slice.call(stack.querySelectorAll('[data-depth]'));
      hero.addEventListener('pointermove',function(e){
        var r=hero.getBoundingClientRect(); if(glow){glow.style.opacity='1';glow.style.left=(e.clientX-r.left)+'px';glow.style.top=(e.clientY-r.top)+'px';}
        var sr=stack.getBoundingClientRect(); var cx=(e.clientX-(sr.left+sr.width/2))/sr.width, cy=(e.clientY-(sr.top+sr.height/2))/sr.height;
        frames.forEach(function(f){var d=parseFloat(f.getAttribute('data-depth'))||0;f.style.transform='translate('+(cx*d)+'px,'+(cy*d)+'px)';});
      });
      hero.addEventListener('pointerleave',function(){if(glow)glow.style.opacity='0';frames.forEach(function(f){f.style.transform='';});});
    }
  }
})();`;
