import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { amountDue } from "@/lib/bookings";
import { expireOverdueBookings } from "@/lib/booking-expiry";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import type { BookingStatus } from "@/lib/types";
import { fmtThai as _fmtThai, ymdUtc } from "@/lib/date-th";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookings · Admin",
  robots: { index: false, follow: false },
};

/** Statuses that need an admin decision (dead-ends without admin action). */
const ATTENTION_STATUSES: BookingStatus[] = ["cancel_requested", "slip_disputed", "payment_review", "return_disputed"];

const FILTERS = [
  { key: "attention", label: "รอแอดมิน" },
  { key: "cancel_requested", label: "ขอยกเลิก" },
  { key: "slip_disputed", label: "สลิปมีปัญหา" },
  { key: "return_disputed", label: "โต้แย้งการไม่คืน" },
  { key: "waiting_for_payment", label: "รอชำระ" },
  { key: "confirmed", label: "ยืนยันแล้ว" },
  { key: "payment_expired", label: "หมดเวลาชำระ" },
  { key: "all", label: "ทั้งหมด" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const PAGE_SIZE = 20;

/** UTC-based Date → "DD/MM/YYYY". Preserves admin's existing UTC-midnight semantics. */
const fmtThai = (d: Date) => _fmtThai(ymdUtc(d));

const fmtDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  // Lazy sweep: flip overdue waiting_for_payment bookings before listing.
  await expireOverdueBookings();

  const active: FilterKey = FILTERS.some((f) => f.key === searchParams?.status)
    ? (searchParams!.status as FilterKey)
    : "attention";

  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where =
    active === "all"
      ? undefined
      : active === "attention"
        ? { status: { in: ATTENTION_STATUSES } }
        : { status: active as BookingStatus };

  const [rows, totalCount] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        rentalTotal: true,
        deposit: true,
        shippingFee: true,
        status: true,
        currentDueAt: true,
        recipientName: true,
        items: { orderBy: { createdAt: "asc" as const }, take: 1, select: { product: { select: { name: true } } } },
        shop: { select: { name: true } },
        renter: { select: { fullName: true, email: true } },
      },
    }),
    db.booking.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(p: number) {
    return `/admin/bookings?status=${active}&page=${p}`;
  }

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        Bookings
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
        จัดการการจอง เคลียร์คำขอยกเลิกและสลิปที่มีปัญหา
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={`/admin/bookings?status=${f.key}`}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: `1px solid ${active === f.key ? "var(--ink)" : "var(--line)"}`,
              borderRadius: 6,
              background: active === f.key ? "var(--ink)" : "var(--surface)",
              color: active === f.key ? "var(--on-dark)" : "var(--ink)",
              fontWeight: active === f.key ? 600 : 500,
            }}
          >
            {f.label}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
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
          ไม่มีการจองในหมวดนี้
        </div>
      ) : (
        <>
          {/* Count summary */}
          <div className="mb-3 flex items-center justify-between text-[13px] text-[var(--ink-3)]">
            <span>
              แสดง {skip + 1}–{Math.min(skip + PAGE_SIZE, totalCount)} จาก {totalCount} รายการ
            </span>
            {totalPages > 1 && (
              <span>หน้า {page} / {totalPages}</span>
            )}
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "var(--surface)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  <Th>ชุด</Th>
                  <Th>ผู้เช่า</Th>
                  <Th>ร้าน</Th>
                  <Th>วันเช่า</Th>
                  <Th>ยอดรวม</Th>
                  <Th>สถานะ</Th>
                  <Th>ครบกำหนดชำระ</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <Td>
                      <Link href={`/admin/bookings/${b.id}`} style={{ fontWeight: 600 }}>
                        {b.items[0]?.product?.name ?? "สินค้า"}
                      </Link>
                    </Td>
                    <Td>
                      <div>{b.renter?.fullName ?? b.recipientName ?? "-"}</div>
                      <div style={{ color: "var(--ink-3)", fontSize: 12 }}>{b.renter?.email ?? ""}</div>
                    </Td>
                    <Td>{b.shop?.name ?? "-"}</Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      {fmtThai(b.startDate)} – {fmtThai(b.endDate)}
                    </Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      ฿{amountDue({ rental_total: b.rentalTotal, deposit: b.deposit, shipping_fee: b.shippingFee }).toLocaleString()}
                    </Td>
                    <Td>
                      <BookingStatusBadge status={b.status as BookingStatus} />
                    </Td>
                    <Td style={{ whiteSpace: "nowrap", color: "var(--ink-3)" }}>
                      {b.currentDueAt ? fmtDateTime(b.currentDueAt) : "-"}
                    </Td>
                    <Td>
                      <Link href={`/admin/bookings/${b.id}`} className="btn btn-outline" style={{ padding: "5px 12px", fontSize: 12 }}>
                        จัดการ
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {page > 1 && (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-2)] hover:border-[var(--ink-3)]"
                >
                  ← ก่อนหน้า
                </Link>
              )}
              {paginationRange(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`dot-${i}`} className="px-1.5 text-[13px] text-[var(--ink-3)]">…</span>
                ) : (
                  <Link
                    key={p}
                    href={pageHref(p as number)}
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
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-2)] hover:border-[var(--ink-3)]"
                >
                  ถัดไป →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Generate a compact page number list like [1, 2, 3, "...", 10]. */
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "10px 12px", fontWeight: 600, fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "10px 12px", verticalAlign: "top", ...style }}>{children}</td>;
}
