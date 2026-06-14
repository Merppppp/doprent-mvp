import type { Metadata } from "next";
import { db } from "@/lib/db";
import ReviewAdminRow from "./ReviewAdminRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews · Admin",
  robots: { index: false, follow: false },
};

const STATUS_OPTS = ["visible", "hidden"] as const;
type StatusOpt = (typeof STATUS_OPTS)[number];

export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const activeStatus = (STATUS_OPTS as readonly string[]).includes(searchParams?.status ?? "")
    ? (searchParams!.status as StatusOpt)
    : "visible";

  const rows = await db.review.findMany({
    where: { status: activeStatus },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      shop: { select: { name: true, slug: true } },
      reviewer: { select: { fullName: true, email: true } },
    },
  });

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>รีวิวร้าน</h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>จัดการรีวิวจากผู้เช่า</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {STATUS_OPTS.map((s) => (
          <a key={s} href={`/admin/reviews?status=${s}`}
            style={{
              padding: "7px 14px", fontSize: 13,
              border: `1px solid ${activeStatus === s ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 6,
              background: activeStatus === s ? "var(--ink)" : "var(--surface)",
              color: activeStatus === s ? "var(--on-dark)" : "var(--ink)",
              fontWeight: activeStatus === s ? 600 : 500,
              textDecoration: "none",
            }}
          >
            {s === "visible" ? "แสดงผล" : "ซ่อน"}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-3)" }}>
          ไม่มีรีวิวในสถานะนี้
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <ReviewAdminRow key={r.id} review={{
              id: r.id,
              shop_name: r.shop.name,
              shop_slug: r.shop.slug,
              reviewer_name: r.reviewer?.fullName ?? null,
              reviewer_email: r.reviewer?.email ?? null,
              rating: r.rating,
              comment: r.comment,
              status: r.status,
              created_at: r.createdAt.toISOString(),
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
