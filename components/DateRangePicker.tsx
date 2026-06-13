"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { priceForNights } from "@/lib/pricing";
import type { PriceTier } from "@/lib/types";
import LineMessageCopyBox from "@/components/LineMessageCopyBox";

type Props = {
  /**
   * Base LINE URL (without our query params). Pass empty string "" for
   * anonymous viewers — when isLoggedIn is false, the LINE href is
   * never built or rendered.
   */
  lineUrl: string;
  /** Dress display name (used in pre-filled LINE message). */
  dressName: string;
  /** Boutique name for the LINE message. */
  boutiqueName: string;
  /** Public URL of the dress detail page (so seller can preview it). */
  dressPageUrl?: string;
  /** First image URL of the dress (sent as a link in LINE message). */
  dressImageUrl?: string;
  /** Base/fallback per-day rental price (THB). */
  pricePerDay?: number;
  /** Optional duration-based pricing tiers (overrides flat per-day when set). */
  priceTiers?: PriceTier[] | null;
  /** Deposit (THB). */
  deposit?: number;
  /** Unavailable dates as YYYY-MM-DD strings. Renter can't pick a range overlapping these. */
  blackouts?: string[];
  /** Combined unavailable date set (blackouts + bookings + closed days). Renter can't pick a range overlapping these. */
  unavailable?: string[];
  /** Minimum days in advance the rental must start. */
  leadTimeDays?: number;
  /** Minimum rental length in days. */
  minRentalDays?: number;
  /** Maximum rental length in days; null = unlimited. */
  maxRentalDays?: number | null;
  /** Optional dress ID to be tracked in /api/track when user clicks LINE. */
  productId?: string;
  shopId?: string;
  /** Optional dress tag code (e.g. internal SKU) to include in LINE message */
  dressTagCode?: string;
  /**
   * Strict contact gate. When false (default), the LINE booking button
   * is replaced with a login redirect and the LINE URL is never used.
   * Caller should also pass lineUrl="" for anon to avoid leaking it.
   */
  isLoggedIn?: boolean;
  /** Where to redirect back after login. Required when !isLoggedIn. */
  loginNext?: string;
};

/** Convert YYYY-MM-DD → "DD/MM/YYYY" Thai display format. */
function fmtThai(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

/** Days between two YYYY-MM-DD dates, inclusive. Returns 0 if either is empty/invalid or end < start. */
function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 86_400_000) + 1;
}

/** Inclusive list of YYYY-MM-DD between start and end (assumes start ≤ end). */
function rangeDates(start: string, end: string): string[] {
  if (!start || !end) return [];
  const result: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];
  const cur = new Date(s);
  while (cur <= e) {
    result.push(isoOf(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return isoOf(d);
})();

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_DOW = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"]; // Monday-first

/**
 * Renter-side date range picker. Blocks dates the seller has marked as unavailable
 * and pre-fills a LINE message with image, link, dates and price.
 */
export default function DateRangePicker({
  lineUrl,
  dressName,
  boutiqueName,
  dressPageUrl,
  dressImageUrl,
  pricePerDay,
  priceTiers,
  deposit,
  blackouts = [],
  productId,
  shopId,
  dressTagCode,
  isLoggedIn,
}: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const blackoutSet = useMemo(() => new Set(blackouts), [blackouts]);
  const nights = nightsBetween(start, end);
  const quote = priceForNights(priceTiers ?? null, pricePerDay ?? 0, nights);

  // Conflict check: does the selected range hit any blackout?
  const conflictDates = useMemo(() => {
    if (!start || !end) return [];
    return rangeDates(start, end).filter((d) => blackoutSet.has(d));
  }, [start, end, blackoutSet]);

  const hasConflict = conflictDates.length > 0;

  // Up to 6 nearest future blackouts to show as warning
  const nextBlackouts = useMemo(() => {
    return blackouts.filter((d) => d >= TODAY).sort().slice(0, 6);
  }, [blackouts]);

  const lineHref = useMemo(() => {
    if (!isLoggedIn || !lineUrl) return "";
    if (!start || !end || nights === 0 || hasConflict) return lineUrl;
    const lines = [
      `สวัสดีค่ะ สนใจเช่าชุด "${dressName}"`,
      `ร้าน: ${boutiqueName}`,
      `วันที่: ${fmtThai(start)} ถึง ${fmtThai(end)} (${nights} วัน)`,
    ];
    if (typeof pricePerDay === "number") {
      lines.push(`ราคา: ฿${quote.perDay.toLocaleString()}/วัน × ${nights} = ฿${quote.total.toLocaleString()}`);
    }
    if (typeof deposit === "number" && deposit > 0) {
      lines.push(`ค่ามัดจำ: ฿${deposit.toLocaleString()}`);
    }
    if (dressPageUrl) lines.push(`ลิงก์ชุด: ${dressPageUrl}`);
    if (dressImageUrl) lines.push(`รูป: ${dressImageUrl}`);
    const text = lines.join("\n");
    const sep = lineUrl.includes("?") ? "&" : "?";
    return `${lineUrl}${sep}text=${encodeURIComponent(text)}`;
  }, [isLoggedIn, lineUrl, start, end, nights, hasConflict, dressName, boutiqueName, pricePerDay, priceTiers, deposit, dressPageUrl, dressImageUrl, quote.perDay, quote.total]);

  function trackAndGo(e: React.MouseEvent<HTMLAnchorElement>) {
    if (productId || shopId) {
      try {
        const blob = new Blob(
          [JSON.stringify({ product_id: productId, shop_id: shopId, source: "detail_datepicker" })],
          { type: "application/json" },
        );
        if (navigator.sendBeacon) navigator.sendBeacon("/api/track", blob);
      } catch {
        // ignore
      }
    }
    void e;
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 16, background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>เลือกวันที่อยากเช่า (ไม่บังคับ)</div>
        {start ? (
          <button
            type="button"
            onClick={() => { setStart(""); setEnd(""); }}
            style={{ fontSize: 12, color: "var(--ink-3)", background: "none", border: 0, cursor: "pointer", padding: 0 }}
          >
            ล้าง
          </button>
        ) : null}
      </div>

      <Calendar
        start={start}
        end={end}
        minISO={TODAY}
        blackoutSet={blackoutSet}
        onChange={(s, e) => { setStart(s); setEnd(e); }}
      />

      <div style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "center", margin: "10px 0 2px", minHeight: 18 }}>
        {start && !end ? "เลือกวันคืนชุด (แตะหรือลากไปอีกวัน)" : start && end ? `${fmtThai(start)} → ${fmtThai(end)}` : "แตะวันรับชุดเพื่อเริ่ม"}
      </div>

      {/* Blackouts info */}
      {nextBlackouts.length > 0 ? (
        <div style={{ padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, color: "var(--ink-2)", margin: "10px 0", lineHeight: 1.5 }}>
          <div style={{ color: "var(--ink)", fontWeight: 500, marginBottom: 3 }}>วันที่ร้านไม่ว่าง:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {nextBlackouts.map((d) => (
              <span key={d} style={{ padding: "2px 8px", background: "rgba(220,38,38,0.08)", color: "#DC2626", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                {fmtThai(d)}
              </span>
            ))}
            {blackouts.filter((d) => d >= TODAY).length > nextBlackouts.length ? (
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                +{blackouts.filter((d) => d >= TODAY).length - nextBlackouts.length} วัน
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Conflict warning */}
      {hasConflict ? (
        <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6, fontSize: 13, color: "#DC2626", marginBottom: 10, lineHeight: 1.5, fontWeight: 500 }}>
          ⚠️ ช่วงวันที่เลือกชนกับวันที่ไม่ว่าง ({conflictDates.map(fmtThai).join(", ")}) กรุณาเลือกใหม่
        </div>
      ) : null}

      {nights > 0 && !hasConflict ? (
        <div style={{ padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
          <div style={{ fontWeight: 500, color: "var(--ink)" }}>
            ระยะเวลา: {nights} วัน ({fmtThai(start)} ถึง {fmtThai(end)})
          </div>
          {typeof pricePerDay === "number" ? (
            <div style={{ marginTop: 2 }}>
              ราคา: ฿{quote.total.toLocaleString()} ({nights} × ฿{quote.perDay.toLocaleString()}/วัน)
            </div>
          ) : null}
          <div style={{ marginTop: 2 }}>
            กด &quot;จองเลย&quot; เพื่อเลือกที่อยู่จัดส่งและชำระเงินผ่าน QR PromptPay
          </div>
        </div>
      ) : null}

      {nights > 0 && !hasConflict ? (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {isLoggedIn && productId ? (
            <Link href={`/checkout/address?product=${productId}&start=${start}&end=${end}`} onClick={trackAndGo} className="btn btn-primary" style={{ display: "block", padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600 }}>
              จองเลย · {nights} วัน
            </Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(`/checkout/address?product=${productId ?? ""}&start=${start}&end=${end}`)}`} className="btn btn-dark" style={{ display: "block", padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600 }}>
              เข้าสู่ระบบเพื่อจอง · {nights} วัน
            </Link>
          )}
          {isLoggedIn && lineHref ? (
            <a href={lineHref} target="_blank" rel="noopener noreferrer" onClick={trackAndGo} style={{ display: "block", padding: "10px 16px", textAlign: "center", fontSize: 13, fontWeight: 500, color: "var(--ink-2)", border: "1px solid var(--line)", borderRadius: 8, textDecoration: "none" }}>
              สอบถามร้านก่อน (LINE)
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Show copy box only when a valid range is selected */}
      {start && end && !hasConflict ? (
        <div style={{ marginTop: 12 }}>
          <LineMessageCopyBox
            dressName={dressName}
            boutiqueName={boutiqueName}
            pricePerDay={pricePerDay}
            dressPageUrl={dressPageUrl ?? ""}
            dateFrom={start}
            dateTo={end}
            tagCode={dressTagCode}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── Calendar ─────────────────────────── */

function Calendar({
  start,
  end,
  minISO,
  blackoutSet,
  onChange,
}: {
  start: string;
  end: string;
  minISO: string;
  blackoutSet: Set<string>;
  onChange: (start: string, end: string) => void;
}) {
  const init = start ? new Date(start) : new Date();
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const [preview, setPreview] = useState("");
  const down = useRef(false);

  const rangeEnd = end || (preview && start && preview >= start ? preview : "");

  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const isDisabled = (iso: string) => iso < minISO || blackoutSet.has(iso);

  const onDown = (iso: string) => {
    if (isDisabled(iso)) return;
    down.current = true;
    setPreview("");
    if (!start || (start && end)) onChange(iso, "");
    else if (iso < start) onChange(iso, "");
    else onChange(start, iso);
  };
  const onEnter = (iso: string) => {
    if (down.current && start && !end && !isDisabled(iso) && iso >= start) setPreview(iso);
  };
  const onUp = (iso: string) => {
    if (down.current && start && !end && iso > start && !isDisabled(iso)) onChange(start, iso);
    down.current = false;
    setPreview("");
  };

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const canPrev = `${view.y}-${pad(view.m + 1)}` > minISO.slice(0, 7);

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      style={{ userSelect: "none", touchAction: "manipulation" }}
      onPointerLeave={() => { down.current = false; setPreview(""); }}
      onPointerUp={() => { down.current = false; }}
    >
      {/* Month header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <NavBtn dir="prev" disabled={!canPrev} onClick={() => canPrev && shiftMonth(-1)} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {TH_MONTHS[view.m]} {view.y}
        </div>
        <NavBtn dir="next" onClick={() => shiftMonth(1)} />
      </div>

      {/* Weekday row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 2 }}>
        {TH_DOW.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--ink-3)", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {cells.map((day, i) => {
          if (day == null) return <div key={`b${i}`} />;
          const iso = `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
          const disabled = isDisabled(iso);
          const isStart = !!start && iso === start;
          const isEnd = !!rangeEnd && iso === rangeEnd;
          const inRange = !!start && !!rangeEnd && iso > start && iso < rangeEnd;
          const isToday = iso === minISO;

          // Pill background for the selected band.
          let bandBg = "transparent";
          let bandRadius = "0";
          if (start && rangeEnd && start !== rangeEnd && iso >= start && iso <= rangeEnd) {
            bandBg = "var(--accent-soft)";
            if (iso === start) bandRadius = "999px 0 0 999px";
            else if (iso === rangeEnd) bandRadius = "0 999px 999px 0";
          }

          const filled = isStart || isEnd;
          return (
            <div key={iso} style={{ display: "flex", justifyContent: "center", padding: "2px 0", background: bandBg, borderRadius: bandRadius }}>
              <button
                type="button"
                disabled={disabled}
                onPointerDown={() => onDown(iso)}
                onPointerEnter={() => onEnter(iso)}
                onPointerUp={() => onUp(iso)}
                aria-label={fmtThai(iso)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: isToday && !filled ? "1px solid var(--accent)" : "1px solid transparent",
                  background: filled ? "var(--accent)" : inRange ? "transparent" : "transparent",
                  color: filled ? "var(--accent-ink)" : disabled ? "var(--ink-3)" : inRange ? "var(--accent-2)" : "var(--ink)",
                  fontSize: 14,
                  fontWeight: filled ? 600 : 400,
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  textDecoration: disabled && blackoutSet.has(iso) ? "line-through" : "none",
                  fontVariantNumeric: "tabular-nums",
                  padding: 0,
                }}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavBtn({ dir, onClick, disabled }: { dir: "prev" | "next"; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "เดือนก่อนหน้า" : "เดือนถัดไป"}
      style={{
        width: 30, height: 30, borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)",
        display: "grid", placeItems: "center", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, color: "var(--ink-2)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <polyline points="15,6 9,12 15,18" /> : <polyline points="9,6 15,12 9,18" />}
      </svg>
    </button>
  );
}
