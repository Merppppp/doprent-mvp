import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoutiqueCover } from "@/components/DressArt";
import DressCard from "@/components/DressCard";
import LineButton from "@/components/LineButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCurrentUser } from "@/lib/auth";
import { getBoutiqueBySlug, listDressesByBoutique } from "@/lib/dresses";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const b = await getBoutiqueBySlug(params.slug);
  if (!b) return { title: "ไม่พบร้าน", robots: { index: false } };
  return {
    title: b.name,
    description: b.tag ?? `${b.name} · ${b.area_label}`,
    alternates: { canonical: `${SITE}/boutique/${b.slug}` },
  };
}

export default async function BoutiquePage({ params }: { params: Params }) {
  const b = await getBoutiqueBySlug(params.slug);
  if (!b) notFound();
  const [dresses, user] = await Promise.all([
    listDressesByBoutique(b.id),
    getCurrentUser().catch(() => null),
  ]);
  const savedSet = new Set<string>(user?.savedDressIds ?? []);
  const isLoggedIn = !!user;

  return (
    <div className="shell" style={{ paddingBottom: 80 }}>
      <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "20px 0 8px" }}>
        <Link href="/boutiques">← ดูร้านทั้งหมด</Link>
      </div>

      {/* Cover */}
      <div style={{ aspectRatio: "5/2", borderRadius: 8, overflow: "hidden", margin: "28px 0 0" }}>
        <BoutiqueCover color={b.cover_color} />
      </div>

      {/* Head */}
      <div
        style={{
          padding: "24px 0 12px",
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>{b.area_label}</div>
          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {b.name}
            {b.verified ? <VerifiedBadge size="md" withLabel /> : null}
          </h1>
          <div style={{ fontSize: 14, color: "var(--ink-2)", maxWidth: 600, lineHeight: 1.55 }}>
            {b.tag}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <LineButton
            href={isLoggedIn ? b.line_url : null}
            label="ทักร้านทาง LINE"
            variant="primary"
            source="boutique_primary"
            boutiqueId={b.id}
            isLoggedIn={isLoggedIn}
            loginNext={`/boutique/${b.slug}`}
          />
        </div>
      </div>

      {/* Info grid
          ⚠️ PRIVACY: never render b.address (full street/house number) here —
          this page is public. Show only b.area_label (district) so renters
          can gauge convenience without exposing the boutique's exact location.
          Full address stays in DB and is visible to the owner in /sell/edit
          and to admins in /admin/boutiques. The seller will share their
          pickup address with confirmed renters privately via LINE. */}
      <div
        className="boutique-info-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          padding: "18px 0",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          margin: "20px 0 28px",
        }}
      >
        <InfoCell k="ย่าน" v={b.area_label} />
        {b.hours ? <InfoCell k="เวลาทำการ" v={b.hours} /> : null}
        {b.instagram ? <InfoCell k="Instagram" v={b.instagram} /> : null}
        {b.since_year ? (
          <InfoCell k="เปิดบริการ" v={`ตั้งแต่ ${b.since_year}${b.owner_name ? ` · ดูแลโดย ${b.owner_name}` : ""}`} />
        ) : null}
      </div>

      {/* Story */}
      {b.story ? (
        <div
          style={{
            padding: "0 0 32px",
            maxWidth: 720,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            fontSize: 15,
          }}
        >
          {b.story}
        </div>
      ) : null}

      {/* Listings */}
      <div
        className="section-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          padding: "20px 0 14px",
          gap: 8,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>ชุดทั้งหมดจาก {b.name}</h2>
        <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{dresses.length} ชุด</span>
      </div>

      {dresses.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--ink-3)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
          }}
        >
          ยังไม่มีชุดในร้านนี้ ทักร้านสอบถามได้
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 20 }}>
          {dresses.map((d, i) => (
            <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoCell({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>{k}</div>
      <div style={{ fontSize: 14, lineHeight: 1.4 }}>{v}</div>
    </div>
  );
}
