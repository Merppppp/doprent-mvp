import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LINE Clicks · Admin",
  robots: { index: false, follow: false },
};

const RANGES = [
  { key: "7d", label: "7 วัน", days: 7 },
  { key: "30d", label: "30 วัน", days: 30 },
  { key: "all", label: "ทั้งหมด", days: 0 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

export default async function ClicksAdmin({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = (RANGES.find((r) => r.key === searchParams?.range) ?? RANGES[0]) as
    (typeof RANGES)[number];
  const activeRange = range.key as RangeKey;

  const since = range.days > 0 ? new Date(Date.now() - range.days * 86_400_000) : null;

  const rawClicks = await db.lineClick.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 1500,
    include: {
      product: { select: { name: true, slug: true, shop: { select: { name: true } } } },
      shop: { select: { name: true, slug: true } },
    },
  });

  const rows = rawClicks.map((r) => ({
    id: r.id, product_id: r.productId, shop_id: r.shopId,
    source: r.source, created_at: r.createdAt.toISOString(),
    products: r.product ? { name: r.product.name, slug: r.product.slug, shop_name: r.product.shop?.name ?? null } : null,
    shops: r.shop ? { name: r.shop.name, slug: r.shop.slug } : null,
  }));

  // Aggregations
  const byShop = new Map<string, { name: string; slug: string; count: number }>();
  const byProduct = new Map<string, { name: string; slug: string; shop_name: string | null; count: number }>();
  const bySource: Record<string, number> = {};
  // Daily counts for last N days
  const dailyMap = new Map<string, number>();
  const days = range.days > 0 ? range.days : 30;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const k = d.toISOString().slice(0, 10);
    dailyMap.set(k, 0);
  }

  for (const r of rows) {
    if (r.shop_id && r.shops) {
      const key = r.shop_id;
      const curr = byShop.get(key);
      if (curr) {
        curr.count++;
      } else {
        byShop.set(key, { name: r.shops.name, slug: r.shops.slug, count: 1 });
      }
    }
    if (r.product_id && r.products) {
      const key = r.product_id;
      const curr = byProduct.get(key);
      if (curr) {
        curr.count++;
      } else {
        byProduct.set(key, {
          name: r.products.name,
          slug: r.products.slug,
          shop_name: r.products.shop_name,
          count: 1,
        });
      }
    }
    const src = r.source ?? "unknown";
    bySource[src] = (bySource[src] ?? 0) + 1;

    const day = r.created_at.slice(0, 10);
    if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }

  const topShops = Array.from(byShop.values()).sort((a, b) => b.count - a.count).slice(0, 20);
  const topProducts = Array.from(byProduct.values()).sort((a, b) => b.count - a.count).slice(0, 20);
  const daily = Array.from(dailyMap.entries());
  const maxDaily = Math.max(1, ...daily.map(([, v]) => v));

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        LINE Clicks
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        การคลิกปุ่ม LINE ของลูกค้า (conversion proxy)
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {RANGES.map((r) => (
          <a
            key={r.key}
            href={`/admin/clicks?range=${r.key}`}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: `1px solid ${activeRange === r.key ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 6,
              background: activeRange === r.key ? "var(--ink)" : "var(--surface)",
              color: activeRange === r.key ? "var(--on-dark)" : "var(--ink)",
              fontWeight: activeRange === r.key ? 600 : 400,
            }}
          >
            {r.label}
          </a>
        ))}
      </div>

      <div className="grid-3" style={{ gap: 14, marginBottom: 32 }}>
        <Stat label="Total clicks" value={rows.length} />
        <Stat label="Unique shops" value={byShop.size} />
        <Stat label="Unique products" value={byProduct.size} />
      </div>

      {/* Daily bar chart */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
        คลิกรายวัน ({range.days || 30} วันล่าสุด)
      </h2>
      <div
        style={{
          padding: 16,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 3,
            height: 120,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {daily.map(([day, count]) => (
            <div
              key={day}
              title={`${day}: ${count} คลิก`}
              style={{
                flex: "0 0 14px",
                height: `${(count / maxDaily) * 100}%`,
                minHeight: 2,
                background: count > 0 ? "var(--ink)" : "var(--line)",
                borderRadius: "2px 2px 0 0",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--ink-3)" }}>
          <span>{daily[0]?.[0] ?? ""}</span>
          <span>{daily[daily.length - 1]?.[0] ?? ""}</span>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 18, marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Top ร้านค้า</h2>
          <Table
            rows={topShops.map((b) => ({
              label: (
                <Link href={`/boutique/${b.slug}`} target="_blank" style={{ fontWeight: 500 }}>
                  {b.name}
                </Link>
              ),
              count: b.count,
            }))}
            emptyText="ยังไม่มีคลิก"
          />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Top สินค้า</h2>
          <Table
            rows={topProducts.map((d) => ({
              label: (
                <Link href={`/dress/${d.slug}`} target="_blank" style={{ fontWeight: 500 }}>
                  {d.name}
                  {d.shop_name ? <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 6 }}>· {d.shop_name}</span> : null}
                </Link>
              ),
              count: d.count,
            }))}
            emptyText="ยังไม่มีคลิก"
          />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>แหล่งที่มาของคลิก</h2>
        <div
          style={{
            padding: 16,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
          }}
        >
          {Object.entries(bySource).length === 0 ? (
            <div style={{ color: "var(--ink-3)" }}>ยังไม่มีคลิก</div>
          ) : (
            Object.entries(bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([src, n]) => (
                <div
                  key={src}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "6px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span style={{ fontFamily: "monospace" }}>{src}</span>
                  <span style={{ fontWeight: 600 }}>{n}</span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function Table({
  rows,
  emptyText,
}: {
  rows: Array<{ label: React.ReactNode; count: number }>;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          textAlign: "center",
          color: "var(--ink-3)",
          fontSize: 13,
        }}
      >
        {emptyText}
      </div>
    );
  }
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 14px",
            fontSize: 13,
            borderTop: i > 0 ? "1px solid var(--line)" : "none",
          }}
        >
          <span>{r.label}</span>
          <span style={{ fontWeight: 600 }}>{r.count}</span>
        </div>
      ))}
    </div>
  );
}
