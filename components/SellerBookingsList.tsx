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
  initialRows: SellerBookingCardWithTrust[];
  initialTotal: number;
  statusCounts?: Record<string, number>;
  initialStatus?: string;
};

function statusToTab(status: string | undefined): BookingTabKey {
  if (!status) return "all";
  for (const t of BOOKING_TABS) {
    if (t.statuses?.includes(status as never)) return t.key;
  }
  return "all";
}

function countForTab(key: BookingTabKey, counts: Record<string, number>): number {
  if (key === "cancelled_shop") return counts["_cancelled_shop"] || 0;
  if (key === "cancelled_renter") return counts["_cancelled_renter"] || 0;
  if (key === "all") {
    const special = (counts["_cancelled_shop"] || 0) + (counts["_cancelled_renter"] || 0);
    const raw = Object.entries(counts)
      .filter(([k]) => !k.startsWith("_"))
      .reduce((s, [, v]) => s + v, 0);
    return raw;
  }
  const tab = BOOKING_TABS.find((t) => t.key === key);
  if (!tab || !tab.statuses) return 0;
  return tab.statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);
}

export default function SellerBookingsList({
  initialRows,
  initialTotal,
  statusCounts = {},
  initialStatus,
}: Props) {
  const [tab, setTab] = useState<BookingTabKey>(() => statusToTab(initialStatus));
  const [sinceDays, setSinceDays] = useState<number | null>(null);

  const [items, setItems] = useState<SellerBookingCardWithTrust[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);
  const didInit = useRef(false);

  const hasMore = items.length < total;

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (initialStatus) {
      const t = statusToTab(initialStatus);
      if (t !== "all") {
        applyFilter(t, null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = useCallback(async (nextTab: BookingTabKey, nextDays: number | null) => {
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const res = await fetchSellerBookingsPage(nextTab, nextDays, 0);
      if (reqRef.current !== reqId) return;
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
      {/* ── Tabs — horizontally scrollable, equal sizing ── */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: "2px solid var(--line)",
          marginBottom: 16,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {BOOKING_TABS.map((t) => {
          const active = tab === t.key;
          const count = countForTab(t.key, statusCounts);
          const isActionable = ["booking_pending", "payment_review", "returned"].includes(t.key) && count > 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onTab(t.key)}
              style={{
                position: "relative",
                padding: "12px 10px 10px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                marginBottom: -2,
                cursor: "pointer",
                textAlign: "center",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--accent)" : "var(--ink-2)",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t.label}
              {count > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 5,
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: isActionable ? "var(--danger, #e53e3e)" : active ? "var(--accent)" : "var(--line)",
                    color: isActionable || active ? "#fff" : "var(--ink-2)",
                  }}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
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
          {items.map((b, i) => {
            const startUrgency = daysUntil(b.start_date);
            return (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600 }}>{b.dress_name ?? "ชุด"}</span>
                    <BookingStatusBadge status={b.status} />
                    {b.source === "walk_in" && (
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--accent-soft, rgba(99,102,241,0.1))",
                          color: "var(--accent)",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        หน้าร้าน
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--ink-2)", marginTop: 2 }}>
                    <span>{b.recipient_name ?? ""}</span>
                    {b.trust_score ? <TrustBadge score={b.trust_score} /> : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 12.5, flexWrap: "wrap" }}>
                    <span style={{ color: startUrgency !== null && startUrgency <= 2 ? "var(--danger, #e53e3e)" : startUrgency !== null && startUrgency <= 5 ? "var(--warn)" : "var(--ink-2)", fontWeight: startUrgency !== null && startUrgency <= 2 ? 700 : 500 }}>
                      เริ่มเช่า {fmtThai(b.start_date)}
                      {startUrgency !== null && startUrgency <= 0
                        ? " (วันนี้!)"
                        : startUrgency !== null && startUrgency === 1
                          ? " (พรุ่งนี้)"
                          : startUrgency !== null && startUrgency <= 5
                            ? ` (อีก ${startUrgency} วัน)`
                            : ""}
                    </span>
                    <span style={{ color: "var(--line)" }}>|</span>
                    <span style={{ color: "var(--ink-3)" }}>
                      สั่งเมื่อ {relativeTime(b.created_at)}
                    </span>
                  </div>
                  <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 2 }}>
                    ช่วงเช่า {fmtThai(b.start_date)} – {fmtThai(b.end_date)} · ฿{b.amount_due.toLocaleString()}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

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

function daysUntil(ymd: string): number | null {
  const d = new Date(ymd + "T00:00:00+07:00");
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const todayBkk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  todayBkk.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - todayBkk.getTime()) / 86400000);
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return fmtThai(iso.slice(0, 10));
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
