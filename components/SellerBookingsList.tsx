"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import { Spinner } from "@/components/Loading";
import TrustBadge from "@/components/TrustBadge";
import { ProductArt } from "@/components/ProductArt";
import {
  BOOKING_TABS,
  BOOKING_GROUPS,
  DAYS_BACK_OPTIONS,
  SELLER_BOOKINGS_PAGE_SIZE,
  type BookingTabKey,
  type BookingGroupKey,
  type BookingFilterKey,
  groupForStatus,
} from "@/lib/seller-booking-tabs";
import {
  fetchSellerBookingsPage,
  type SellerBookingCardWithTrust,
} from "@/app/actions/seller-bookings";
import { fmtThai } from "@/lib/date-th";
import { sizeLabel } from "@/lib/types";

type Props = {
  initialRows: SellerBookingCardWithTrust[];
  initialTotal: number;
  statusCounts?: Record<string, number>;
  initialStatus?: string;
};

// ─── selection model ──────────────────────────────────────────────────────────

type Zone = "todo" | "browse";

interface Selection {
  zone: Zone;
  group: BookingGroupKey;
  sub: BookingTabKey | null;
}

function resolveFilterKey(sel: Selection): BookingFilterKey {
  if (sel.sub !== null) return sel.sub;
  if (sel.zone === "todo") return "todo";
  return sel.group;
}

// ─── count helpers ────────────────────────────────────────────────────────────

function countForTab(key: BookingTabKey, counts: Record<string, number>): number {
  if (key === "cancelled_shop") return counts["_cancelled_shop"] || 0;
  if (key === "cancelled_renter") return counts["_cancelled_renter"] || 0;
  if (key === "all") {
    return Object.entries(counts)
      .filter(([k]) => !k.startsWith("_"))
      .reduce((s, [, v]) => s + v, 0);
  }
  const tab = BOOKING_TABS.find((t) => t.key === key);
  if (!tab || !tab.statuses) return 0;
  return tab.statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);
}

function countForGroup(groupKey: BookingGroupKey, counts: Record<string, number>): number {
  if (groupKey === "all") return countForTab("all", counts);
  if (groupKey === "done") return countForTab("completed", counts);
  if (groupKey === "todo") {
    return (
      countForTab("booking_pending", counts) +
      countForTab("payment_review", counts) +
      countForTab("returned", counts)
    );
  }
  if (groupKey === "active") {
    return (
      countForTab("waiting_for_payment", counts) +
      countForTab("confirmed", counts) +
      countForTab("renting", counts) +
      countForTab("awaiting_return", counts)
    );
  }
  if (groupKey === "cancelled") {
    return countForTab("cancelled_shop", counts) + countForTab("cancelled_renter", counts);
  }
  return 0;
}

// ─── label helpers ────────────────────────────────────────────────────────────

function labelForTab(key: BookingTabKey): string {
  return BOOKING_TABS.find((t) => t.key === key)?.label ?? key;
}

function labelForGroup(key: BookingGroupKey): string {
  return BOOKING_GROUPS.find((g) => g.key === key)?.label ?? key;
}

function nowViewingLabel(sel: Selection): string {
  if (sel.zone === "todo") {
    if (sel.sub !== null) return labelForTab(sel.sub);
    return "งานที่ต้องทำ";
  }
  if (sel.sub !== null) return labelForTab(sel.sub);
  return labelForGroup(sel.group);
}

// ─── initial selection ────────────────────────────────────────────────────────

function initialSelection(
  statusCounts: Record<string, number>,
  initialStatus: string | undefined,
): Selection {
  if (initialStatus) {
    const { group, sub } = groupForStatus(initialStatus);
    const zone: Zone = group === "todo" ? "todo" : "browse";
    return { zone, group, sub };
  }
  const todoTotal =
    countForTab("booking_pending", statusCounts) +
    countForTab("payment_review", statusCounts) +
    countForTab("returned", statusCounts);
  if (todoTotal > 0) {
    return { zone: "todo", group: "todo", sub: null };
  }
  return { zone: "browse", group: "all", sub: null };
}

// ─── component ────────────────────────────────────────────────────────────────

export default function SellerBookingsList({
  initialRows,
  initialTotal,
  statusCounts = {},
  initialStatus,
}: Props) {
  const [sel, setSel] = useState<Selection>(() =>
    initialSelection(statusCounts, initialStatus),
  );
  const [sinceDays, setSinceDays] = useState<number | null>(null);

  const [items, setItems] = useState<SellerBookingCardWithTrust[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);
  const didInit = useRef(false);

  const hasMore = items.length < total;

  // Derived counts
  const todoTotal =
    countForTab("booking_pending", statusCounts) +
    countForTab("payment_review", statusCounts) +
    countForTab("returned", statusCounts);

  const applyFilter = useCallback(
    async (nextSel: Selection, nextDays: number | null) => {
      const reqId = ++reqRef.current;
      setLoading(true);
      try {
        const key = resolveFilterKey(nextSel);
        const res = await fetchSellerBookingsPage(key, nextDays, 0);
        if (reqRef.current !== reqId) return;
        setItems(res.rows);
        setTotal(res.total);
      } finally {
        if (reqRef.current === reqId) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const initSel = initialSelection(statusCounts, initialStatus);
    const key = resolveFilterKey(initSel);
    if (key !== "all") {
      setSel(initSel);
      applyFilter(initSel, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSelect(next: Selection) {
    setSel(next);
    applyFilter(next, sinceDays);
  }

  function onDays(next: number | null) {
    if (next === sinceDays) return;
    setSinceDays(next);
    applyFilter(sel, next);
  }

  const loadMore = useCallback(async () => {
    if (loading || items.length >= total) return;
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const key = resolveFilterKey(sel);
      const res = await fetchSellerBookingsPage(key, sinceDays, items.length);
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
  }, [loading, items.length, total, sel, sinceDays]);

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

  // ─── browse group helper ────────────────────────────────────────────────────
  const browseGroups = BOOKING_GROUPS.filter((g) => g.key !== "todo");
  const selectedBrowseGroup = BOOKING_GROUPS.find((g) => g.key === sel.group);
  const browseSubTabs =
    sel.zone === "browse" && selectedBrowseGroup && selectedBrowseGroup.memberTabs.length > 0
      ? selectedBrowseGroup.memberTabs
      : [];

  return (
    <div>
      {/* ════════════════════════════════════════════════════════════════════
          TIER 1 — Action card "ต้องทำตอนนี้"
          ════════════════════════════════════════════════════════════════════ */}
      {todoTotal > 0 ? (
        <div
          style={{
            background: "var(--warn-soft)",
            border: "0.5px solid var(--warn)",
            borderRadius: 14,
            padding: "12px 13px",
            marginBottom: 16,
          }}
        >
          {/* Header row — selects todo-whole */}
          {(() => {
            const todoWholeActive = sel.zone === "todo" && sel.sub === null;
            return (
              <button
                type="button"
                onClick={() => onSelect({ zone: "todo", group: "todo", sub: null })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  marginBottom: 10,
                  gap: 7,
                }}
              >
                {/* dot */}
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: todoWholeActive ? "var(--accent)" : "var(--warn-ink)",
                    flexShrink: 0,
                  }}
                />
                {/* label */}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: todoWholeActive ? "var(--accent)" : "var(--warn-ink)",
                    borderBottom: todoWholeActive ? "2px solid var(--accent)" : "2px solid transparent",
                    paddingBottom: 1,
                    lineHeight: 1.3,
                  }}
                >
                  ต้องทำตอนนี้
                </span>
                {/* count — right-aligned */}
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span
                    style={{
                      fontSize: 19,
                      fontWeight: 500,
                      color: "var(--warn-ink)",
                    }}
                  >
                    {todoTotal}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--warn-ink)" }}> รายการ</span>
                </span>
              </button>
            );
          })()}

          {/* Sub-group chips */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {(
              [
                { tabKey: "booking_pending" as BookingTabKey, label: "รอยืนยัน" },
                { tabKey: "payment_review" as BookingTabKey, label: "ตรวจสลิป" },
                { tabKey: "returned" as BookingTabKey, label: "รอตรวจคืน" },
              ] as const
            ).map(({ tabKey, label }) => {
              const count = countForTab(tabKey, statusCounts);
              const isActive = sel.zone === "todo" && sel.sub === tabKey;
              const borderColor = isActive
                ? "var(--accent)"
                : count > 0
                  ? "var(--warn)"
                  : "var(--line)";
              const bgColor = isActive ? "var(--surface)" : "transparent";
              const textColor = isActive
                ? "var(--accent)"
                : count > 0
                  ? "var(--warn-ink)"
                  : "var(--ink-3)";
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => onSelect({ zone: "todo", group: "todo", sub: tabKey })}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 999,
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    fontSize: 12.5,
                    fontWeight: isActive ? 500 : 400,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        color: textColor,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Calm success card — not selectable */
        <div
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--line)",
            borderRadius: 14,
            padding: "12px 13px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20, color: "var(--success)" }}>✓</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--success)" }}>
              เคลียร์หมดแล้ว
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
              ไม่มีงานค้างต้องทำตอนนี้
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TIER 2 — "ดูย้อนหลัง" browse
          ════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: sel.zone === "browse" && browseSubTabs.length > 0 ? 0 : 16 }}>
        {/* Muted label */}
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>ดูย้อนหลัง</div>

        {/* Underline tab row */}
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            borderBottom: "2px solid var(--line)",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {browseGroups.map((grp) => {
            const active = sel.zone === "browse" && sel.group === grp.key;
            const count = countForGroup(grp.key, statusCounts);
            return (
              <button
                key={grp.key}
                type="button"
                onClick={() =>
                  onSelect({ zone: "browse", group: grp.key, sub: null })
                }
                style={{
                  position: "relative",
                  padding: "10px 12px 8px",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                  marginBottom: -2,
                  cursor: "pointer",
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--accent)" : "var(--ink-2)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                }}
              >
                <span>{grp.shortLabel ?? grp.label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 11, color: active ? "var(--accent)" : "var(--ink-3)" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sub-chip row — only when browse zone and group has member tabs */}
        {sel.zone === "browse" && browseSubTabs.length > 0 && (
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              gap: 7,
              padding: "10px 0 10px",
            }}
          >
            {/* "ทั้งหมด·groupCount" chip — selects whole group */}
            {(() => {
              const groupCount = sel.group !== "all" && sel.group !== "done" && sel.group !== "todo"
                ? countForGroup(sel.group, statusCounts)
                : 0;
              const isActive = sel.zone === "browse" && sel.sub === null;
              return (
                <button
                  key="__group_all"
                  type="button"
                  onClick={() =>
                    onSelect({ zone: "browse", group: sel.group, sub: null })
                  }
                  style={subChipStyle(isActive)}
                >
                  ทั้งหมด
                  {groupCount > 0 && (
                    <span style={{ fontSize: 11, marginLeft: 3 }}>{groupCount}</span>
                  )}
                </button>
              );
            })()}
            {browseSubTabs.map((tabKey) => {
              const count = countForTab(tabKey, statusCounts);
              const isActive = sel.zone === "browse" && sel.sub === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() =>
                    onSelect({ zone: "browse", group: sel.group, sub: tabKey })
                  }
                  style={subChipStyle(isActive)}
                >
                  {labelForTab(tabKey)}
                  {count > 0 && (
                    <span style={{ fontSize: 11, marginLeft: 3 }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Days-back filter + NOW-VIEWING line
          ════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
          marginTop: sel.zone === "browse" && browseSubTabs.length > 0 ? 0 : 16,
        }}
      >
        {/* Now-viewing line */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              borderRadius: 999,
              fontSize: 11,
              padding: "3px 9px",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            กำลังดู: {nowViewingLabel(sel)}
          </span>
          <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            พบ <b>{total}</b> รายการ
          </span>
        </div>

        {/* Days-back chips */}
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

      {/* ════════════════════════════════════════════════════════════════════
          Booking card list — UNCHANGED markup
          ════════════════════════════════════════════════════════════════════ */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-2)" }}>
          {loading ? <Spinner size={22} label="กำลังโหลด…" /> : "ไม่มีการจองในหมวดนี้"}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, opacity: loading ? 0.45 : 1, transition: "opacity 0.15s", pointerEvents: loading ? "none" : "auto" }}>
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
                    {b.dress_size ? (
                      <span className="whitespace-nowrap rounded bg-bg-hover px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">
                        ไซซ์ {sizeLabel(b.dress_size)}
                      </span>
                    ) : null}
                    <BookingStatusBadge status={b.status} />
                    {b.slip_review_urgent && (
                      <span className="inline-flex items-center rounded-full bg-[var(--danger,#e53e3e)] px-2 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
                        ตรวจสลิปด่วน
                      </span>
                    )}
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
                      {startUrgency !== null && startUrgency === 0
                        ? " (วันนี้!)"
                        : startUrgency !== null && startUrgency === 1
                          ? " (พรุ่งนี้)"
                          : startUrgency !== null && startUrgency > 1 && startUrgency <= 5
                            ? ` (อีก ${startUrgency} วัน)`
                            : startUrgency !== null && startUrgency < 0
                              ? ` (เลยมาแล้ว ${Math.abs(startUrgency)} วัน)`
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
            {loading ? <><Spinner size={14} /> กำลังโหลด…</> : "โหลดเพิ่ม"}
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

// ─── style helpers ────────────────────────────────────────────────────────────

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

function subChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
    background: active ? "var(--accent-soft)" : "var(--surface)",
    color: active ? "var(--accent-2)" : "var(--ink-2)",
    fontSize: 12.5,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    flexShrink: 0,
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
