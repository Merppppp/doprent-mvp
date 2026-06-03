import Link from "next/link";
import type { Metadata } from "next";
import { BoutiqueCover } from "@/components/DressArt";
import VerifiedBadge from "@/components/VerifiedBadge";
import { listBoutiques } from "@/lib/dresses";

export const revalidate = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export const metadata: Metadata = {
  title: "ร้านเช่าทั้งหมด",
  description: "รวมร้านเช่าชุดในกรุงเทพฯ ทักร้านผ่าน LINE ได้โดยตรง",
  alternates: { canonical: `${SITE}/boutiques` },
};

type SearchParams = { q?: string };

export default async function BoutiquesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = (searchParams?.q ?? "").trim();
  const all = await listBoutiques({ featuredFirst: true });
  const needle = search.toLowerCase();
  const boutiques = needle
    ? all.filter((b) =>
        `${b.name} ${b.area_label} ${b.instagram ?? ""} ${b.tag ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : all;

  return (
    <div className="shell boutiques-list" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <h1 className="page-title" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em" }}>ร้านเช่าทั้งหมด</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 14, marginTop: 6, marginBottom: 18 }}>
        {search ? (
          <>
            พบ <b style={{ color: "var(--ink)" }}>{boutiques.length}</b> ร้านสำหรับ &ldquo;{search}&rdquo;
            {" · "}
            <Link href="/boutiques" style={{ color: "var(--ink-2)" }}>
              ล้างการค้นหา
            </Link>
          </>
        ) : (
          <>{all.length} ร้านในกรุงเทพ</>
        )}
      </div>

      {/* Search bar */}
      <form method="get" style={{ marginBottom: 24, position: "relative", maxWidth: 460 }}>
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="ค้นหาชื่อร้าน, ย่าน หรือ IG…"
          aria-label="ค้นหาร้านเช่า"
          style={{
            width: "100%",
            padding: "11px 14px 11px 38px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--surface)",
            fontSize: 14,
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-3)",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          ⌕
        </span>
      </form>

      {boutiques.length === 0 ? (
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            color: "var(--ink-3)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
          }}
        >
          <h3 style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6, fontWeight: 600 }}>
            ไม่พบร้านที่ตรงกับคำค้นหา
          </h3>
          <p style={{ fontSize: 14, marginBottom: 18 }}>ลองค้นด้วยชื่อย่าน เช่น &ldquo;ทองหล่อ&rdquo; หรือ &ldquo;สยาม&rdquo;</p>
          <Link href="/boutiques" className="btn btn-outline">
            ดูร้านทั้งหมด
          </Link>
        </div>
      ) : (
      <div className="grid-2" style={{ gap: 20 }}>
        {boutiques.map((b) => (
          <Link
            key={b.id}
            href={`/boutique/${b.slug}`}
            className="boutique-card"
            style={{
              background: "var(--surface)",
              border: `1px solid ${b.featured ? "var(--gold)" : "var(--line)"}`,
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
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {b.name}
                {b.verified ? <VerifiedBadge size="sm" /> : null}
              </h3>
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
      )}
    </div>
  );
}
