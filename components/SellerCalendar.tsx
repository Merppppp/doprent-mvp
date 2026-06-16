"use client";

/**
 * components/SellerCalendar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified shop-owner calendar: shows bookings, product blackouts, and shop
 * closed dates in a single month grid.  Month nav + optional product filter.
 *
 * Visual states per day cell (single-product filter):
 *   allFree  — normal/white (surface bg) → every size still available
 *   someFree — amber bg → at least one size available, at least one blocked
 *   noneFree — red bg  → every size blocked
 *
 * Visual states per day cell (all-products overview):
 *   normal — no bookings & no blackout that day
 *   amber  — ≥1 booking or blackout that day ("มีจองบางส่วน")
 *
 * Closed days always show "ปิด" indicator + dimmed opacity regardless of state.
 *
 * Interaction: clicking a day opens a detail panel below the grid listing
 * every booking for that day plus per-size availability thumbnails.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import type { SellerCalendarData, CalendarBooking, CalendarProduct } from "@/lib/seller-calendar";
import { BOOKING_STATUS_META } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

// ─── constants ───────────────────────────────────────────────────────────────

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** Format Date → "YYYY-MM-DD" using LOCAL time. */
function toLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Format "YYYY-MM-DD" → Thai "DD เดือน YYYY (BE)" */
function fmtThaiDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${parseInt(d, 10)} ${MONTHS_TH[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`;
}

/** Format "YYYY-MM-DD" → "DD/MM/YY" */
function fmtShort(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${String(parseInt(y, 10) + 543).slice(-2)}`;
}

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: "var(--surface)", fg: "var(--ink-2)" },
  info:    { bg: "var(--info-soft)", fg: "var(--cobalt)" },
  warn:    { bg: "var(--warn-soft)", fg: "var(--warn)" },
  success: { bg: "var(--success-soft)", fg: "var(--success)" },
  danger:  { bg: "var(--danger-soft)", fg: "var(--danger)" },
};

// ─── per-size availability types ─────────────────────────────────────────────

type SizeStatus = {
  size: string;
  freeUnits: number;
  available: boolean;
  blocked: boolean;
};

type ProductSizeAvail = {
  product: CalendarProduct;
  hasBlackout: boolean;
  shopClosed: boolean;
  sizes: SizeStatus[];
};

// ─── props ────────────────────────────────────────────────────────────────────

type Props = {
  data: SellerCalendarData;
};

// ─── component ────────────────────────────────────────────────────────────────

export default function SellerCalendar({ data }: Props) {
  const today = new Date();
  const todayStr = toLocalYmd(today);

  // ── view state ────────────────────────────────────────────────────────────
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  const [filterProductId, setFilterProductId] = useState<string>(""); // "" = all
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ── month navigation ──────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  }

  // ── product lookup map ────────────────────────────────────────────────────
  const productById = useMemo(() => {
    const m = new Map<string, CalendarProduct>();
    for (const p of data.products) m.set(p.id, p);
    return m;
  }, [data.products]);

  // ── filtered bookings (by product, for display) ───────────────────────────
  const filteredBookings = useMemo(
    () => filterProductId
      ? data.bookings.filter((b) => b.productId === filterProductId)
      : data.bookings,
    [data.bookings, filterProductId]
  );

  // ── booking count by (productId :: size :: date) ──────────────────────────
  // Excludes legacy bookings (size === null) — those don't decrement any size.
  const bookingCountBySizeDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of data.bookings) {
      if (b.size === null) continue; // legacy booking — skip
      const cur = new Date(b.startDate + "T00:00:00Z");
      const end = new Date(b.endDate + "T00:00:00Z");
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10);
        const key = `${b.productId}::${b.size}::${d}`;
        map.set(key, (map.get(key) ?? 0) + 1);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
    return map;
  }, [data.bookings]);

  // ── lookup maps (bookings per day, for display/count) ─────────────────────
  // Expand each booking's date range into individual days → O(bookings × days)
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of filteredBookings) {
      const cur = new Date(b.startDate + "T00:00:00Z");
      const end = new Date(b.endDate + "T00:00:00Z");
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10);
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(b);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
    return map;
  }, [filteredBookings]);

  // blackout dates as Set<"productId::date"> → O(1) lookup
  const blackoutSet = useMemo(() => {
    const s = new Set<string>();
    const filtered = filterProductId
      ? data.blackoutDates.filter((bd) => bd.productId === filterProductId)
      : data.blackoutDates;
    for (const bd of filtered) s.add(`${bd.productId}::${bd.date}`);
    return s;
  }, [data.blackoutDates, filterProductId]);

  // blackout dates as Set<date string> (any product, respecting filter)
  const blackoutDaySet = useMemo(() => {
    const s = new Set<string>();
    const filtered = filterProductId
      ? data.blackoutDates.filter((bd) => bd.productId === filterProductId)
      : data.blackoutDates;
    for (const bd of filtered) s.add(bd.date);
    return s;
  }, [data.blackoutDates, filterProductId]);

  // shop closed dates as Map<date, note>
  const closedDateMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const cd of data.closedDates) m.set(cd.date, cd.note);
    return m;
  }, [data.closedDates]);

  function isShopClosed(dateStr: string): boolean {
    if (closedDateMap.has(dateStr)) return true;
    const weekday = new Date(dateStr + "T12:00:00").getDay();
    return data.closedWeekdays.includes(weekday);
  }

  // ── per-product day status (3-level: allFree / someFree / noneFree) ────────
  function getProductDayStatus(
    product: CalendarProduct,
    dateStr: string
  ): "allFree" | "someFree" | "noneFree" {
    // Blackout or shop closed blocks everything for this product
    const hasBlackout = data.blackoutDates.some(
      (bd) => bd.productId === product.id && bd.date === dateStr
    );
    if (hasBlackout || isShopClosed(dateStr)) return "noneFree";

    let freeCount = 0;
    let blockedCount = 0;
    for (const v of product.variants) {
      if (!v.available) {
        blockedCount++;
        continue;
      }
      const booked = bookingCountBySizeDay.get(`${product.id}::${v.size}::${dateStr}`) ?? 0;
      if (v.quantity - booked > 0) freeCount++;
      else blockedCount++;
    }

    if (freeCount === 0) return "noneFree";
    if (blockedCount === 0) return "allFree";
    return "someFree";
  }

  // ── grid cells ────────────────────────────────────────────────────────────
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<string | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null); // leading blanks
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewYear, viewMonth, d);
    cells.push(toLocalYmd(dt));
  }
  while (cells.length < 42) cells.push(null); // pad to 6 rows

  // ── selected day data ─────────────────────────────────────────────────────
  const selectedBookings = selectedDay ? (bookingsByDay.get(selectedDay) ?? []) : [];
  const selectedIsBlackout = selectedDay ? blackoutDaySet.has(selectedDay) : false;
  const selectedIsClosed = selectedDay ? isShopClosed(selectedDay) : false;
  const selectedClosedNote = selectedDay ? (closedDateMap.get(selectedDay) ?? null) : null;

  // ── per-product size availability for detail panel ────────────────────────
  const detailProductAvailability = useMemo((): ProductSizeAvail[] => {
    if (!selectedDay) return [];

    // Determine which products to show in the panel
    const relevantIds = new Set<string>();
    if (filterProductId) {
      relevantIds.add(filterProductId);
    } else {
      // Products with any booking on this day (using all bookings, not filtered)
      for (const b of data.bookings) {
        const cur = new Date(b.startDate + "T00:00:00Z");
        const end = new Date(b.endDate + "T00:00:00Z");
        const sel = new Date(selectedDay + "T00:00:00Z");
        if (cur <= sel && sel <= end) relevantIds.add(b.productId);
      }
      // Products with a blackout on this day
      for (const bd of data.blackoutDates) {
        if (bd.date === selectedDay) relevantIds.add(bd.productId);
      }
    }

    // Weekday closed check
    const weekday = new Date(selectedDay + "T12:00:00").getDay();
    const shopClosedDay = closedDateMap.has(selectedDay) || data.closedWeekdays.includes(weekday);

    return data.products
      .filter((p) => relevantIds.has(p.id))
      .map((p) => {
        const hasBlackout = data.blackoutDates.some(
          (bd) => bd.productId === p.id && bd.date === selectedDay
        );
        const sizes: SizeStatus[] = p.variants.map((v) => {
          const booked =
            bookingCountBySizeDay.get(`${p.id}::${v.size}::${selectedDay}`) ?? 0;
          const freeUnits = Math.max(0, v.quantity - booked);
          const blocked =
            !v.available || freeUnits <= 0 || hasBlackout || shopClosedDay;
          return { size: v.size, freeUnits, available: v.available, blocked };
        });
        return { product: p, hasBlackout, shopClosed: shopClosedDay, sizes };
      });
  }, [
    selectedDay,
    filterProductId,
    data.products,
    data.bookings,
    data.blackoutDates,
    data.closedWeekdays,
    bookingCountBySizeDay,
    closedDateMap,
  ]);

  // ── summary counts for current month ─────────────────────────────────────
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const bookedDaysThisMonth = Array.from(bookingsByDay.keys()).filter((d) => d.startsWith(monthPrefix)).length;
  const blackoutDaysThisMonth = Array.from(blackoutDaySet).filter((d) => d.startsWith(monthPrefix)).length;

  // ─────────────────────────────────────────────────────────────────────────
  // Selected filtered product (for single-product cell coloring)
  const selectedFilterProduct = filterProductId ? (productById.get(filterProductId) ?? null) : null;

  return (
    <div style={{ maxWidth: 440, marginInline: "auto" }}>
      {/* ── Header: title + product filter ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {data.products.length > 1 && (
          <select
            value={filterProductId}
            onChange={(e) => { setFilterProductId(e.target.value); setSelectedDay(null); }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              fontSize: 14,
              color: "var(--ink)",
              cursor: "pointer",
            }}
            aria-label="กรองตามสินค้า"
          >
            <option value="">สินค้าทั้งหมด</option>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: "auto" }}>
          เดือนนี้: จอง {bookedDaysThisMonth} วัน · ปิดเอง {blackoutDaysThisMonth} วัน
        </div>
      </div>

      {/* ── Month navigation ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
        }}
      >
        <button type="button" onClick={prevMonth} style={navBtnStyle} aria-label="เดือนก่อนหน้า">
          ←
        </button>
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          {MONTHS_TH[viewMonth]} {viewYear + 543}
        </div>
        <button type="button" onClick={nextMonth} style={navBtnStyle} aria-label="เดือนถัดไป">
          →
        </button>
      </div>

      {/* ── Weekday header ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
        {DAYS_TH.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--ink-3)",
              padding: "4px 0",
              letterSpacing: "0.04em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} style={{ aspectRatio: "1/1" }} />;

          const dayBookings = bookingsByDay.get(dateStr) ?? [];
          const hasBookings = dayBookings.length > 0;
          const hasBlackout = blackoutDaySet.has(dateStr);
          const isClosed = isShopClosed(dateStr);
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const isSelected = dateStr === selectedDay;

          // ── cell coloring ──────────────────────────────────────────────
          let bg: string;
          let borderColorBase: string;

          if (selectedFilterProduct) {
            // Single-product mode: 3-level tone
            const status = getProductDayStatus(selectedFilterProduct, dateStr);
            if (status === "noneFree") {
              bg = "var(--danger-soft)";
              borderColorBase = "var(--danger)";
            } else if (status === "someFree") {
              bg = "var(--warn-soft)";
              borderColorBase = "var(--warn)";
            } else {
              bg = "var(--surface)";
              borderColorBase = "var(--line)";
            }
          } else {
            // All-products overview: amber if any booking or blackout
            if (hasBookings || hasBlackout) {
              bg = "var(--warn-soft)";
              borderColorBase = "var(--warn)";
            } else {
              bg = isClosed ? "var(--bg)" : "var(--surface)";
              borderColorBase = "var(--line)";
            }
          }

          const borderColor = isSelected
            ? "var(--ink)"
            : isToday && borderColorBase === "var(--line)"
            ? "var(--cobalt)"
            : borderColorBase;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              aria-pressed={isSelected}
              aria-label={`${parseInt(dateStr.slice(8), 10)} ${MONTHS_TH[viewMonth]}${hasBookings ? ` (จอง ${dayBookings.length})` : ""}${isClosed ? " (ร้านหยุด)" : ""}`}
              style={{
                aspectRatio: "1/1",
                position: "relative",
                border: `${isSelected ? "2px" : "1px"} solid ${borderColor}`,
                background: bg,
                borderRadius: 7,
                cursor: "pointer",
                opacity: isPast ? 0.55 : 1,
                fontSize: 13,
                fontWeight: isToday ? 700 : 400,
                color: isClosed && !hasBookings ? "var(--ink-3)" : "var(--ink)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                padding: "2px 1px",
                transition: "border-color 0.12s, box-shadow 0.12s",
                boxShadow: isSelected ? "0 0 0 2px var(--warn-soft)" : undefined,
                minHeight: 38,
              }}
            >
              {/* Day number */}
              <span style={{ lineHeight: 1 }}>{parseInt(dateStr.slice(8), 10)}</span>

              {/* Booking count badge */}
              {hasBookings && (
                <span
                  style={{
                    background: selectedFilterProduct ? "var(--danger)" : "var(--warn)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: "1px 4px",
                    borderRadius: 999,
                    minWidth: 14,
                    textAlign: "center",
                  }}
                >
                  {dayBookings.length}
                </span>
              )}

              {/* Small indicators row */}
              {(hasBlackout || (isClosed && !isPast)) && (
                <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  {hasBlackout && !hasBookings && (
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--warn)", display: "block" }} />
                  )}
                  {isClosed && (
                    <span style={{ fontSize: 8, color: "var(--ink-3)", lineHeight: 1 }}>ปิด</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          fontSize: 12,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {selectedFilterProduct ? (
          // Single-product legend: 3 levels
          <>
            <LegendItem color="var(--surface)" border="var(--line)" label="ว่างทุกไซส์" />
            <LegendItem color="var(--warn-soft)" border="var(--warn)" label="ว่างบางไซส์" />
            <LegendItem color="var(--danger-soft)" border="var(--danger)" label="เต็มทุกไซส์" />
          </>
        ) : (
          // All-products legend
          <>
            <LegendItem color="var(--surface)" border="var(--line)" label="ว่าง" />
            <LegendItem color="var(--warn-soft)" border="var(--warn)" label="มีจองบางส่วน" />
          </>
        )}
        <LegendItem color="var(--bg)" border="var(--line)" label="ร้านหยุด" dim />
        <LegendItem color="var(--surface)" border="var(--cobalt)" label="วันนี้" />
      </div>

      {/* ── Day detail panel ── */}
      {selectedDay && (
        <DayDetailPanel
          dateStr={selectedDay}
          bookings={selectedBookings}
          isBlackout={selectedIsBlackout}
          isClosed={selectedIsClosed}
          closedNote={selectedClosedNote}
          onClose={() => setSelectedDay(null)}
          productAvailability={detailProductAvailability}
          productById={productById}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LegendItem({
  color,
  border,
  label,
  dim,
}: {
  color: string;
  border: string;
  label: string;
  dim?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 14,
          height: 14,
          background: color,
          border: `1px solid ${border}`,
          borderRadius: 3,
          display: "inline-block",
          opacity: dim ? 0.55 : 1,
        }}
      />
      <span style={{ color: "var(--ink-2)" }}>{label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type DayDetailProps = {
  dateStr: string;
  bookings: CalendarBooking[];
  isBlackout: boolean;
  isClosed: boolean;
  closedNote: string | null;
  onClose: () => void;
  productAvailability: ProductSizeAvail[];
  productById: Map<string, CalendarProduct>;
};

function DayDetailPanel({
  dateStr,
  bookings,
  isBlackout,
  isClosed,
  closedNote,
  onClose,
  productAvailability,
  productById,
}: DayDetailProps) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        boxShadow: "var(--shadow-2)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtThaiDate(dateStr)}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          style={{
            width: 28,
            height: 28,
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--bg)",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Closed / blackout banners */}
      {isClosed && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 12px",
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--ink-3)",
          }}
        >
          🚫 ร้านหยุดทำการ{closedNote ? ` — ${closedNote}` : ""}
        </div>
      )}
      {isBlackout && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 12px",
            background: "var(--warn-soft)",
            border: "1px solid var(--warn)",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--warn)",
          }}
        >
          ⛔ วันนี้ถูกปิดสินค้าบางรายการ (blackout)
        </div>
      )}

      {/* ── Size availability summary ── */}
      {productAvailability.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 12,
              color: "var(--ink-3)",
              marginBottom: 6,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            สรุปความว่างตามไซส์
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {productAvailability.map(({ product, hasBlackout: prodBlackout, shopClosed, sizes }) => (
              <div
                key={product.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 10px",
                  background: "var(--bg)",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                }}
              >
                {/* Product thumbnail */}
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      background: "var(--line)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                    {product.name}
                  </div>
                  {shopClosed || prodBlackout ? (
                    <div style={{ fontSize: 11, color: "var(--danger)" }}>
                      {shopClosed ? "ร้านหยุดทำการ — ทุกไซส์ไม่ว่าง" : "ปิดสินค้าชั่วคราว — ทุกไซส์ไม่ว่าง"}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      {/* Free sizes */}
                      {sizes.some((s) => !s.blocked) && (
                        <>
                          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>ว่าง:</span>
                          {sizes
                            .filter((s) => !s.blocked)
                            .map((s) => (
                              <span
                                key={s.size}
                                style={{
                                  padding: "2px 7px",
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: "var(--success-soft)",
                                  color: "var(--success)",
                                }}
                              >
                                {s.size}
                              </span>
                            ))}
                        </>
                      )}
                      {/* Blocked sizes */}
                      {sizes.some((s) => s.blocked) && (
                        <>
                          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>ไม่ว่าง:</span>
                          {sizes
                            .filter((s) => s.blocked)
                            .map((s) => (
                              <span
                                key={s.size}
                                style={{
                                  padding: "2px 7px",
                                  borderRadius: 999,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: "var(--danger-soft)",
                                  color: "var(--danger)",
                                  textDecoration: "line-through",
                                }}
                              >
                                {s.size}
                              </span>
                            ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bookings list ── */}
      {bookings.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "8px 0" }}>
          ไม่มีการจองในวันนี้
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {bookings.map((b) => {
            const meta = BOOKING_STATUS_META[b.status as BookingStatus];
            const tone = STATUS_TONE[meta?.tone ?? "neutral"] ?? STATUS_TONE.neutral;
            const product = productById.get(b.productId);
            return (
              <Link
                key={b.id}
                href={`/sell/bookings/${b.id}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.12s",
                }}
              >
                {/* Product thumbnail (small) */}
                {product?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={b.productName}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 5,
                      objectFit: "cover",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 5,
                      background: "var(--line)",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.productName}
                  </div>
                  {b.renterName && (
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 1 }}>
                      {b.renterName}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
                    {fmtShort(b.startDate)} – {fmtShort(b.endDate)}
                  </div>
                </div>

                {/* Size badge + status pill */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: b.size ? "var(--info-soft)" : "var(--bg)",
                      color: b.size ? "var(--cobalt)" : "var(--ink-3)",
                      border: "1px solid var(--line)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.size ? `ไซส์ ${b.size}` : "ไม่ระบุไซส์"}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: tone.bg,
                      color: tone.fg,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {meta?.label ?? b.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  fontSize: 16,
  cursor: "pointer",
  color: "var(--ink)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
