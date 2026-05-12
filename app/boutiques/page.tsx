import Link from "next/link";
import type { Metadata } from "next";
import { BoutiqueCover } from "@/components/DressArt";
import { listBoutiques } from "@/lib/dresses";

export const revalidate = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export const metadata: Metadata = {
  title: "ร้านเช่าทั้งหมด — DopRent",
  description: "รวมร้านเช่าชุดในกรุงเทพฯ ทักร้านผ่าน LINE ได้โดยตรง",
  alternates: { canonical: `${SITE}/boutiques` },
};

export default async function BoutiquesPage() {
  const boutiques = await listBoutiques({ featuredFirst: true });

  return (
    <div className="shell boutiques-list" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <h1 className="page-title" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em" }}>ร้านเช่าทั้งหมด</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 14, marginTop: 6, marginBottom: 24 }}>
        {boutiques.length} ร้านในกรุงเทพ
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {boutiques.map((b) => (
          <Link
            key={b.id}
            href={`/boutique/${b.slug}`}
            className="boutique-card"
            style={{
              background: "var(--surface)",
              border: `1px solid ${b.featured ? "#FCD34D" : "var(--line)"}`,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <div className="cover">
              <BoutiqueCover color={b.cover_color} />
            </div>
            <div style={{ padding: 22, flex: 1 }}>
              {b.featured ? (
                <span
                  className="ad-badge featured"
                  style={{ position: "static", display: "inline-flex", marginBottom: 8 }}
                >
                  <span className="dot" />
                  Featured
                </span>
              ) : null}
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                {b.area_label}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{b.name}</h3>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>
                {b.tag}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {b.since_year ? <span>ตั้งแต่ {b.since_year}</span> : null}
                {b.instagram ? <span>· {b.instagram}</span> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
