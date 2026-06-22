import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ADMIN_PAGE_SIZE as PAGE_SIZE } from "@/lib/config";
import ProductRow from "./ProductRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products · Admin",
  robots: { index: false, follow: false },
};

const STATUS_OPTS = ["pending", "live", "rejected", "all"] as const;
type StatusOpt = (typeof STATUS_OPTS)[number];

const SORT_OPTS = [
  "newest",
  "oldest",
  "name",
  "price-high",
  "price-low",
] as const;
type SortOpt = (typeof SORT_OPTS)[number];

function getOrderBy(sort: SortOpt) {
  if (sort === "oldest") return { createdAt: "asc" as const };
  if (sort === "name") return { name: "asc" as const };
  if (sort === "price-high") return { pricePerDay: "desc" as const };
  if (sort === "price-low") return { pricePerDay: "asc" as const };
  return { createdAt: "desc" as const };
}

function buildHref(base: string, p: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

const SORT_LABELS: Record<SortOpt, string> = {
  newest: "ใหม่ล่าสุด",
  oldest: "เก่าสุด",
  name: "ชื่อ A-Z",
  "price-high": "ราคาสูง",
  "price-low": "ราคาต่ำ",
};

export default async function ProductsAdmin({
  searchParams,
}: {
  searchParams: { status?: string; sort?: string; page?: string };
}) {
  const activeStatus = (STATUS_OPTS as readonly string[]).includes(
    searchParams?.status ?? ""
  )
    ? (searchParams!.status as StatusOpt)
    : "all";

  const activeSort = (SORT_OPTS as readonly string[]).includes(
    searchParams?.sort ?? ""
  )
    ? (searchParams!.sort as SortOpt)
    : "newest";

  const where =
    activeStatus !== "all" ? { status: activeStatus } : undefined;

  const total = await db.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.max(
    1,
    Math.min(totalPages, Number(searchParams?.page) || 1)
  );

  const rawRows = await db.product.findMany({
    where,
    orderBy: getOrderBy(activeSort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      shop: { select: { name: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const rows = rawRows.map((d) => ({
    id: d.id,
    slug: d.slug,
    tag_code: d.tagCode,
    name: d.name,
    designer: d.designer,
    shop_name: d.shop.name,
    size: d.size,
    color: d.color ?? "",
    price_per_day: d.pricePerDay,
    status: d.status,
    available: d.available,
    featured: d.featured,
    sponsored: d.sponsored,
    images: d.images.map((img) => img.url),
    created_at: d.createdAt.toISOString(),
    views: d.views,
  }));

  const base = "/admin/products";
  const statusParam = activeStatus !== "all" ? activeStatus : undefined;
  const sortParam = activeSort !== "newest" ? activeSort : undefined;

  return (
    <div>
      <h1
        className="page-title"
        style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}
      >
        Products
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        จัดการประกาศสินค้า อนุมัติสินค้าใหม่ ติ๊ก Featured
      </p>

      {/* Tab bar */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}
      >
        {STATUS_OPTS.map((s) => (
          <a
            key={s}
            href={buildHref(base, {
              status: s !== "all" ? s : undefined,
              sort: sortParam,
            })}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: `1px solid ${
                activeStatus === s ? "var(--ink)" : "var(--line)"
              }`,
              borderRadius: 6,
              background:
                activeStatus === s ? "var(--ink)" : "var(--surface)",
              color:
                activeStatus === s ? "var(--on-dark)" : "var(--ink)",
              fontWeight: activeStatus === s ? 600 : 500,
            }}
          >
            {s}
          </a>
        ))}
      </div>

      {/* Sort chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>เรียงโดย:</span>
        {SORT_OPTS.map((s) => (
          <a
            key={s}
            href={buildHref(base, {
              status: statusParam,
              sort: s !== "newest" ? s : undefined,
            })}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              border: `1px solid ${
                activeSort === s ? "var(--ink)" : "var(--line)"
              }`,
              borderRadius: 4,
              background: activeSort === s ? "var(--ink)" : "transparent",
              color:
                activeSort === s ? "var(--on-dark)" : "var(--ink-3)",
            }}
          >
            {SORT_LABELS[s]}
          </a>
        ))}
      </div>

      {total === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--ink-3)",
          }}
        >
          ไม่มีสินค้าในสถานะ &ldquo;{activeStatus}&rdquo;
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface)",
                    borderBottom: "2px solid var(--line)",
                  }}
                >
                  <th style={thStyle}>สินค้า</th>
                  <th style={thStyle}>ร้าน</th>
                  <th style={thStyle}>ราคา/วัน</th>
                  <th style={thStyle}>สถานะ</th>
                  <th style={thStyle}>สร้างเมื่อ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <ProductRow key={d.id} d={d} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pager */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginTop: 20,
                alignItems: "center",
              }}
            >
              {page > 1 && (
                <a
                  href={buildHref(base, {
                    status: statusParam,
                    sort: sortParam,
                    page: String(page - 1),
                  })}
                  style={pagerLink}
                >
                  ← Prev
                </a>
              )}
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                หน้า {page} จาก {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={buildHref(base, {
                    status: statusParam,
                    sort: sortParam,
                    page: String(page + 1),
                  })}
                  style={pagerLink}
                >
                  Next →
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "9px 12px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 12,
  color: "var(--ink-3)",
  whiteSpace: "nowrap",
};

const pagerLink: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  color: "var(--ink)",
};
