"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import TrustBadge from "@/components/TrustBadge";
import { ProductArt } from "@/components/ProductArt";
import {
  BOOKING_TABS,
  DAYS_BACK_OPTIONS,
  SELLER_BOOKINGS_PAGE_SIZE,
  type BookingTabKey,
} from "@/lib/seller-booking-tabs";
import {
  fetchSellerBookingsPage,
  type SellerBookingCardWithTrust,
} from "@/app/actions/seller-bookings";
import { fmtThai } from "@/lib/date-th";

type Props = {
  /** Server-rendered first page for the default tab ("all", all time). */
  initialRows: SellerBookingCardWithTrust[];
  initialTotal: number;
};

export default function SellerBookingsList({ initialRows, initialTotal }: Props) {
  const [tab, setTab] = useState<BookingTabKey>("all");
  const [sinceDays, setSinceDays] = useState<number | null>(null);

  const [items, setItems] = useState<SellerBookingCardWithTrust[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  // Tracks the filter combo the current `items` belong to, so a stale async
  // response from a previous filter never appends into the new list.
  const reqRef = useRef(0);

  const hasMore = items.length < total;

  // Re-fetch page 0 whenever the tab or days-back filter changes.
  const applyFilter = useCallback(async (nextTab: BookingTabKey, nextDays: number | null) => {
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const res = await fetchSellerBookingsPage(nextTab, nextDays, 0);
      if (reqRef.current !== reqId) return; // superseded by a newer filter
      setItems(res.rows);
      setTotal(res.total);
    } finally {
      if (reqRef.current === reqId) setLoading(false);
    }
  }, []);

  function onTab(next: BookingTabKey) {
    if (next === tab) return;
    setTab(next);
    setItems([]);
    applyFilter(next, sinceDays);
  }

  function onDays(next: number | null) {
    if (next === sinceDays) return;
    setSinceDays(next);
    setItems([]);
    applyFilter(tab, next);
  }

  const loadMore = useCallback(async () => {
    if (loading || items.length >= total) return;
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const res = await fetchSellerBookingsPage(tab, sinceDays, items.length);
      if (reqRef.current !== reqId) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = res.rows.filter((r) => !seen.has(r.id));
        return next.length ? [...prev, ...next] : prev;
      });
      setTotal(res.total);
    } finally {
      if (reqRef.current === reqId) setLoading(false);
    }
  }, [loading, items.length, total, tab, sinceDays]);

  // Infinite scroll: auto-load when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div>
      {/* Status tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {BOOKING_TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => onTab(t.key)} style={tabBtn(tab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Days-back filter + count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
          พบ <b>{total}</b> รายการ
        </span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DAYS_BACK_OPTIONS.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => onDays(o.value)}
              style={chipBtn(sinceDays === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-2)" }}>
          {loading ? "กำลังโหลด…" : "ไม่มีการจองในหมวดนี้"}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((b, i) => (
            <Link
              key={b.id}
              href={`/sell/bookings/${b.id}`}
              className="hover-lift"
              style={{
                display: "flex",
                gap: 14,
                padding: 14,
                border: "1px solid var(--line)",
                borderRadius: 12,
                background: "var(--surface)",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 66,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "var(--accent-soft)",
                }}
              >
                {b.dress_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.dress_image} alt={b.dress_name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ProductArt color="rose" variant={i} />
                )}
              </div>
              <div style={{ flex: 1, fontSize: 14, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{b.dress_name ?? "ชุด"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--ink-2)" }}>
                  <span>{b.recipient_name ?? ""}</span>
                  {b.trust_score ? <TrustBadge score={b.trust_score} /> : null}
                </div>
                <div style={{ color: "var(--ink-3)", fontSize: 12.5, marginTop: 2 }}>
                  {fmtThai(b.start_date)} – {fmtThai(b.end_date)} · ฿{b.amount_due.toLocaleString()}
                </div>
              </div>
              <BookingStatusBadge status={b.status} />
            </Link>
          ))}
        </div>
      )}

      {/* Load-more zone: sentinel auto-loads on scroll; button is the fallback. */}
      {hasMore ? (
        <div ref={sentinelRef} style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={loadMore} disabled={loading} style={loadBtn(loading)}>
            {loading ? "กำลังโหลด…" : "โหลดเพิ่ม"}
          </button>
          <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            แสดง {items.length} จาก {total} รายการ
          </span>
        </div>
      ) : items.length > SELLER_BOOKINGS_PAGE_SIZE ? (
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12.5, color: "var(--ink-3)" }}>
          แสดงครบทั้ง {total} รายการแล้ว
        </div>
      ) : null}
    </div>
  );
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "var(--accent-ink)" : "var(--ink-2)",
    fontSize: 13.5,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
  };
}

function chipBtn(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
    background: active ? "var(--accent-soft)" : "var(--bg)",
    color: active ? "var(--accent-2)" : "var(--ink-2)",
    fontSize: 12.5,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  };
}

function loadBtn(loading: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 18px",
    borderRadius: 999,
    border: "0",
    background: loading ? "var(--line)" : "var(--accent)",
    color: "var(--accent-ink)",
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "wait" : "pointer",
  };
}
