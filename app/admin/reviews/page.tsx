import Link from "next/link";
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
const PAGE_SIZE = 20;

export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  const activeStatus = (STATUS_OPTS as readonly string[]).includes(searchParams?.status ?? "")
    ? (searchParams!.status as StatusOpt)
    : "visible";

  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const where = { status: activeStatus };

  const [rows, totalCount] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        shop: { select: { name: true, slug: true } },
        reviewer: { select: { fullName: true, email: true } },
      },
    }),
    db.review.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(p: number) {
    return `/admin/reviews?status=${activeStatus}&page=${p}`;
  }

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
        <>
          <div className="mb-3 flex items-center justify-between text-[13px] text-[var(--ink-3)]">
            <span>แสดง {skip + 1}–{Math.min(skip + PAGE_SIZE, totalCount)} จาก {totalCount} รายการ</span>
            {totalPages > 1 && <span>หน้า {page} / {totalPages}</span>}
          </div>

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

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} hrefFn={pageHref} />
          )}
        </>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, hrefFn }: { page: number; totalPages: number; hrefFn: (p: number) => string }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={hrefFn(page - 1)} className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-2)] hover:border-[var(--ink-3)]">
          ← ก่อนหน้า
        </Link>
      )}
      {paginationRange(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`dot-${i}`} className="px-1.5 text-[13px] text-[var(--ink-3)]">…</span>
        ) : (
          <Link key={p} href={hrefFn(p as number)}
            className={`rounded-md border px-3 py-1.5 text-[13px] font-medium ${
              p === page
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--on-dark)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--ink-3)]"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={hrefFn(page + 1)} className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-2)] hover:border-[var(--ink-3)]">
          ถัดไป →
        </Link>
      )}
    </div>
  );
}

function paginationRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  const near = new Set([1, 2, current - 1, current, current + 1, total - 1, total]);
  let prev = 0;
  for (const p of [...near].sort((a, b) => a - b)) {
    if (p < 1 || p > total) continue;
    if (p - prev > 1) pages.push("...");
    pages.push(p);
    prev = p;
  }
  return pages;
}
