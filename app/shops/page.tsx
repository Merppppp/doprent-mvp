import Link from "next/link";
import type { Metadata } from "next";
import ShopFinder from "@/components/ShopFinder";
import { listShopsPage, SHOPS_PAGE_SIZE } from "@/lib/products";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export const metadata: Metadata = {
  title: "ร้านเช่าทั้งหมด",
  description: "รวมร้านเช่าชุดในกรุงเทพฯ ทักร้านผ่าน LINE ได้โดยตรง",
  alternates: { canonical: `${SITE}/shops` },
};

type SearchParams = { q?: string };

export default async function BoutiquesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = (searchParams?.q ?? "").trim();
  // First page only — the rest streams in via "load more" (server action).
  // Filtering + pagination happen at the DB so this scales to thousands of shops.
  const { rows: boutiques, total } = await listShopsPage({
    q: search,
    skip: 0,
    take: SHOPS_PAGE_SIZE,
  });

  return (
    <div className="container boutiques-list" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <h1 className="page-title" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em" }}>ร้านเช่าทั้งหมด</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 14, marginTop: 6, marginBottom: 18 }}>
        {search ? (
          <>
            พบ <b style={{ color: "var(--ink)" }}>{total}</b> ร้านสำหรับ &ldquo;{search}&rdquo;
            {" · "}
            <Link href="/shops" style={{ color: "var(--ink-2)" }}>
              ล้างการค้นหา
            </Link>
          </>
        ) : (
          <>{total} ร้านในกรุงเทพ</>
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

      {total === 0 ? (
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
          <Link href="/shops" className="btn btn-outline">
            ดูร้านทั้งหมด
          </Link>
        </div>
      ) : (
      <ShopFinder
        key={search || "all"}
        shops={boutiques}
        total={total}
        query={search}
        pageSize={SHOPS_PAGE_SIZE}
      />
      )}
    </div>
  );
}
