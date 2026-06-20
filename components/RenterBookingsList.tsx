"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import Link from "next/link";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import { fmtThaiShort } from "@/lib/date-th";
import { RENTER_TABS, RENTER_PAGE_SIZE, type RenterTabKey } from "@/lib/renter-booking-tabs";
import { fetchRenterBookingsPage } from "@/app/actions/renter-bookings";
import type { RenterBookingCard } from "@/lib/booking-queries";

type Props = {
  initialRows: RenterBookingCard[];
  initialTotal: number;
  statusCounts: Record<string, number>;
  initialTab?: string;
};

function tabCount(tab: typeof RENTER_TABS[number], counts: Record<string, number>): number {
  if (!tab.statuses) {
    return Object.values(counts).reduce((a, b) => a + b, 0);
  }
  return tab.statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);
}

export default function RenterBookingsList({ initialRows, initialTotal, statusCounts, initialTab }: Props) {
  const validTab = RENTER_TABS.find((t) => t.key === initialTab)?.key ?? "all";
  const [activeTab, setActiveTab] = useState<RenterTabKey>(validTab);
  const [rows, setRows] = useState<RenterBookingCard[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const tabsRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    (tab: RenterTabKey, skip: number, q: string, append: boolean) => {
      startTransition(async () => {
        const res = await fetchRenterBookingsPage(tab, skip, q || null);
        if (append) {
          setRows((prev) => [...prev, ...res.rows]);
        } else {
          setRows(res.rows);
        }
        setTotal(res.total);
      });
    },
    [],
  );

  const switchTab = (key: RenterTabKey) => {
    setActiveTab(key);
    setSearch("");
    load(key, 0, "", false);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      load(activeTab, 0, val, false);
    }, 350);
  };

  const loadMore = () => {
    load(activeTab, rows.length, search, true);
  };

  // Group rows by shop
  const grouped = groupByShop(rows);
  const hasMore = rows.length < total;

  return (
    <div>
      {/* ── Tabs (Shopee-style horizontal scroll) ── */}
      <div
        ref={tabsRef}
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid var(--line)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          marginBottom: 16,
        }}
      >
        {RENTER_TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = tabCount(tab, statusCounts);
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                flex: "0 0 auto",
                padding: "12px 18px",
                fontSize: 13.5,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--accent)" : "var(--ink-2)",
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -2,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "0.15s",
                position: "relative",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  style={{
                    marginLeft: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    color: active ? "var(--accent)" : "var(--ink-3)",
                  }}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="ค้นหาชื่อสินค้าหรือร้าน..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 13.5,
            background: "var(--surface)",
            outline: "none",
          }}
        />
      </div>

      {/* ── Loading indicator ── */}
      {isPending && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)", fontSize: 13 }}>
          กำลังโหลด...
        </div>
      )}

      {/* ── Empty state ── */}
      {!isPending && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-2)" }}>
          <p style={{ marginBottom: 16, fontSize: 14 }}>ไม่มีรายการจอง</p>
          <Link href="/" className="btn btn-dark" style={{ padding: "10px 22px", fontSize: 13 }}>
            เริ่มเลือกชุด
          </Link>
        </div>
      )}

      {/* ── Booking cards grouped by shop ── */}
      <div style={{ display: "grid", gap: 14 }}>
        {grouped.map((group) => (
          <div
            key={group.shopSlug ?? group.shopName}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "var(--surface)",
              overflow: "hidden",
            }}
          >
            {/* Shop header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderBottom: "1px solid var(--line)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
              {group.shopSlug ? (
                <Link href={`/shop/${group.shopSlug}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {group.shopName}
                </Link>
              ) : (
                <span>{group.shopName}</span>
              )}
            </div>

            {/* Booking items */}
            {group.bookings.map((b) => (
              <Link
                key={b.id}
                href={`/account/bookings/${b.id}`}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line-2, var(--line))",
                  textDecoration: "none",
                  color: "inherit",
                  alignItems: "flex-start",
                  transition: "background 0.12s",
                }}
                className="hover-lift-subtle"
              >
                {/* Product image */}
                <div
                  style={{
                    width: 72,
                    height: 90,
                    borderRadius: 8,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--accent-soft)",
                  }}
                >
                  {b.dress_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.dress_image}
                      alt={b.dress_name ?? ""}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.dress_name ?? "ชุด"}
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 4 }}>
                    {fmtThaiShort(b.start_date)} – {fmtThaiShort(b.end_date)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
                    ฿{(b.rental_total + b.deposit + (b.shipping_fee ?? 0)).toLocaleString()}
                    {b.shipping_fee == null && (
                      <span style={{ fontWeight: 400, fontSize: 11, color: "var(--ink-3)", marginLeft: 4 }}>
                        (ยังไม่รวมค่าส่ง)
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {b.shop_line_url && (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(b.shop_line_url!, "_blank");
                        }}
                        style={{
                          padding: "5px 12px",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: "pointer",
                          background: "var(--bg)",
                        }}
                      >
                        ติดต่อร้าน
                      </span>
                    )}
                    {(b.status === "completed" || b.status === "returned") && b.dress_slug && (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/product/${b.dress_slug}`;
                        }}
                        style={{
                          padding: "5px 12px",
                          border: "1px solid var(--accent)",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "var(--accent)",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "var(--bg)",
                        }}
                      >
                        จองอีกครั้ง
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* ── Load more ── */}
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={loadMore}
            disabled={isPending}
            className="btn"
            style={{
              padding: "10px 28px",
              fontSize: 13,
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--surface)",
              cursor: isPending ? "wait" : "pointer",
            }}
          >
            {isPending ? "กำลังโหลด..." : "ดูเพิ่มเติม"}
          </button>
        </div>
      )}

      {/* ── Count summary ── */}
      {rows.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--ink-3)" }}>
          แสดง {rows.length} จาก {total} รายการ
        </div>
      )}
    </div>
  );
}

type ShopGroup = {
  shopName: string;
  shopSlug: string | null;
  bookings: RenterBookingCard[];
};

function groupByShop(rows: RenterBookingCard[]): ShopGroup[] {
  const map = new Map<string, ShopGroup>();
  for (const b of rows) {
    const key = b.shop_slug ?? b.shop_name ?? "unknown";
    let group = map.get(key);
    if (!group) {
      group = { shopName: b.shop_name ?? "ร้าน", shopSlug: b.shop_slug, bookings: [] };
      map.set(key, group);
    }
    group.bookings.push(b);
  }
  return [...map.values()];
}
