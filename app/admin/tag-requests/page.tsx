import Link from "next/link";
import type { Metadata } from "next";
import { listPendingTagRequests, listReviewedTagRequests } from "@/lib/tags";
import TagRequestRow from "./TagRequestRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "คำขอแท็ก · Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

export default async function TagRequestsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [pending, { rows: reviewed, total: reviewedTotal }] = await Promise.all([
    listPendingTagRequests(),
    listReviewedTagRequests(skip, PAGE_SIZE),
  ]);

  const totalPages = Math.max(1, Math.ceil(reviewedTotal / PAGE_SIZE));

  const toRow = (r: (typeof pending)[number] | (typeof reviewed)[number]) => ({
    id: r.id,
    requestedLabel: r.requestedLabel,
    requestedKey: r.requestedKey,
    status: r.status as "pending" | "approved" | "rejected",
    reviewNotes: "reviewNotes" in r ? (r as { reviewNotes: string | null }).reviewNotes : null,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: "reviewedAt" in r && (r as { reviewedAt: Date | null }).reviewedAt
      ? (r as { reviewedAt: Date }).reviewedAt.toISOString()
      : null,
    tagGroup: r.tagGroup,
    shop: r.shop,
  });

  function pageHref(p: number) {
    return `/admin/tag-requests?page=${p}`;
  }

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        คำขอแท็กจากร้านค้า
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24 }}>
        ตรวจสอบคำขอเพิ่มแท็กใหม่จากผู้ขาย — อนุมัติเพื่อสร้าง Tag จริงในระบบ
      </p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
          รอตรวจสอบ
          {pending.length > 0 ? (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                background: "var(--warn)",
                color: "var(--on-dark)",
                borderRadius: 999,
                padding: "2px 8px",
                fontWeight: 600,
              }}
            >
              {pending.length}
            </span>
          ) : null}
        </h2>
        {pending.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--ink-3)",
              fontSize: 14,
            }}
          >
            ไม่มีคำขอที่รอตรวจสอบ
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((r) => (
              <TagRequestRow key={r.id} req={toRow(r)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
          ตรวจสอบแล้ว
          {reviewedTotal > 0 && (
            <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 400, color: "var(--ink-3)" }}>
              ({reviewedTotal} รายการ)
            </span>
          )}
        </h2>
        {reviewed.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--ink-3)",
              fontSize: 14,
            }}
          >
            ยังไม่มีรายการที่ตรวจสอบแล้ว
          </div>
        ) : (
          <>
            {totalPages > 1 && (
              <div className="mb-3 flex items-center justify-between text-[13px] text-[var(--ink-3)]">
                <span>แสดง {skip + 1}–{Math.min(skip + PAGE_SIZE, reviewedTotal)} จาก {reviewedTotal} รายการ</span>
                <span>หน้า {page} / {totalPages}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reviewed.map((r) => (
                <TagRequestRow key={r.id} req={toRow(r)} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} hrefFn={pageHref} />
            )}
          </>
        )}
      </section>
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
