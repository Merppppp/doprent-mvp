import type { Metadata } from "next";
import { db } from "@/lib/db";
import DressRow from "./DressRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dresses · Admin",
  robots: { index: false, follow: false },
};

const STATUS_OPTS = ["pending", "live", "rejected", "all"] as const;
type StatusOpt = (typeof STATUS_OPTS)[number];

export default async function DressesAdmin({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const activeStatus = (STATUS_OPTS as readonly string[]).includes(searchParams?.status ?? "")
    ? (searchParams!.status as StatusOpt)
    : "pending";

  const rawRows = await db.dress.findMany({
    where: activeStatus !== "all" ? { status: activeStatus } : undefined,
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, tagCode: true, name: true, designer: true, boutiqueName: true, size: true, color: true, pricePerDay: true, status: true, available: true, featured: true, sponsored: true, images: true, createdAt: true, views: true },
  });

  const rows = rawRows.map((d) => ({
    id: d.id, slug: d.slug, tag_code: d.tagCode, name: d.name, designer: d.designer,
    boutique_name: d.boutiqueName, size: d.size, color: d.color, price_per_day: d.pricePerDay,
    status: d.status, available: d.available, featured: d.featured, sponsored: d.sponsored,
    images: d.images as string[], created_at: d.createdAt.toISOString(), views: d.views,
  }));
  const error = null;

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        Dresses
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        จัดการประกาศชุด อนุมัติชุดใหม่ ติ๊ก Featured
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {STATUS_OPTS.map((s) => (
          <a
            key={s}
            href={`/admin/dresses?status=${s}`}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: `1px solid ${activeStatus === s ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 6,
              background: activeStatus === s ? "var(--ink)" : "var(--surface)",
              color: activeStatus === s ? "var(--on-dark)" : "var(--ink)",
              fontWeight: activeStatus === s ? 600 : 500,
            }}
          >
            {s}
          </a>
        ))}
      </div>

      {error ? (
        <div style={{ color: "var(--danger)" }}>โหลดไม่สำเร็จ: {error.message}</div>
      ) : rows.length === 0 ? (
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
          ไม่มีชุดในสถานะ &ldquo;{activeStatus}&rdquo;
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((d) => (
            <DressRow key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}
