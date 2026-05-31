"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  /** Per-day rental price (THB). */
  pricePerDay?: number;
  /** Deposit (THB). */
  deposit?: number;
  /** Unavailable dates as YYYY-MM-DD strings. Renter can't pick a range overlapping these. */
  blackouts?: string[];
  /** Optional dress ID to be tracked in /api/track when user clicks LINE. */
  dressId?: string;
  boutiqueId?: string;
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
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    result.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
})();

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
  deposit,
  blackouts = [],
  dressId,
  boutiqueId,
  dressTagCode,
  isLoggedIn,
  loginNext,
}: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const blackoutSet = useMemo(() => new Set(blackouts), [blackouts]);
  const minEnd = start || TODAY;
  const nights = nightsBetween(start, end);

  // Conflict check: does the selected range hit any blackout?
  const conflictDates = useMemo(() => {
    if (!start || !end) return [];
    return rangeDates(start, end).filter((d) => blackoutSet.has(d));
  }, [start, end, blackoutSet]);

  const hasConflict = conflictDates.length > 0;

  // Up to 6 nearest future blackouts to show as warning
  const nextBlackouts = useMemo(() => {
    return blackouts
      .filter((d) => d >= TODAY)
      .sort()
      .slice(0, 6);
  }, [blackouts]);

  // Skip building the LINE URL entirely for anonymous viewers. Even though
  // the parent passes lineUrl="" in that case, this is belt-and-suspenders —
  // the LINE deep link never exists in the client's JS state for anon.
  const lineHref = useMemo(() => {
    if (!isLoggedIn || !lineUrl) return "";
    if (!start || !end || nights === 0 || hasConflict) return lineUrl;
    const lines = [
      `สวัสดีค่ะ สนใจเช่าชุด "${dressName}"`,
      `ร้าน: ${boutiqueName}`,
      `วันที่: ${fmtThai(start)} ถึง ${fmtThai(end)} (${nights} วัน)`,
    ];
    if (typeof pricePerDay === "number") {
      const total = pricePerDay * nights;
      lines.push(
        `ราคา: ฿${pricePerDay.toLocaleString()}/วัน × ${nights} = ฿${total.toLocaleString()}`,
      );
    }
    if (typeof deposit === "number" && deposit > 0) {
      lines.push(`ค่ามัดจำ: ฿${deposit.toLocaleString()}`);
    }
    if (dressPageUrl) lines.push(`ลิงก์ชุด: ${dressPageUrl}`);
    if (dressImageUrl) lines.push(`รูป: ${dressImageUrl}`);
    const text = lines.join("\n");
    const sep = lineUrl.includes("?") ? "&" : "?";
    return `${lineUrl}${sep}text=${encodeURIComponent(text)}`;
  }, [
    isLoggedIn,
    lineUrl,
    start,
    end,
    nights,
    hasConflict,
    dressName,
    boutiqueName,
    pricePerDay,
    deposit,
    dressPageUrl,
    dressImageUrl,
  ]);

  function trackAndGo(e: React.MouseEvent<HTMLAnchorElement>) {
    if (dressId || boutiqueId) {
      try {
        const blob = new Blob(
          [
            JSON.stringify({
              dress_id: dressId,
              boutique_id: boutiqueId,
              source: "detail_datepicker",
            }),
          ],
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
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
        background: "var(--bg)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        เลือกวันที่อยากเช่า (ไม่บังคับ)
      </div>

      <div
        className="date-row"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: nights > 0 ? 12 : 0,
        }}
      >
        <label style={labelStyle}>
          <span style={labelTextStyle}>วันรับชุด</span>
          <input
            type="date"
            value={start}
            min={TODAY}
            onChange={(e) => {
              setStart(e.target.value);
              if (end && e.target.value && end < e.target.value) setEnd("");
            }}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <span style={labelTextStyle}>วันคืนชุด</span>
          <input
            type="date"
            value={end}
            min={minEnd}
            onChange={(e) => setEnd(e.target.value)}
            style={inputStyle}
            disabled={!start}
          />
        </label>
      </div>

      {/* Blackouts info — shown when there are any */}
      {nextBlackouts.length > 0 ? (
        <div
          style={{
            padding: "8px 10px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--ink-2)",
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: "var(--ink)", fontWeight: 500, marginBottom: 3 }}>
            วันที่ร้านไม่ว่าง:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {nextBlackouts.map((d) => (
              <span
                key={d}
                style={{
                  padding: "2px 8px",
                  background: "rgba(220,38,38,0.08)",
                  color: "#DC2626",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
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
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 6,
            fontSize: 13,
            color: "#DC2626",
            marginBottom: 10,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          ⚠️ ช่วงวันที่เลือกชนกับวันที่ไม่ว่าง ({conflictDates.map(fmtThai).join(", ")}) กรุณาเลือกใหม่
        </div>
      ) : null}

      {nights > 0 && !hasConflict ? (
        <div
          style={{
            padding: "8px 10px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 500, color: "var(--ink)" }}>
            ระยะเวลา: {nights} วัน ({fmtThai(start)} ถึง {fmtThai(end)})
          </div>
          {typeof pricePerDay === "number" ? (
            <div style={{ marginTop: 2 }}>
              ราคา: ฿{(pricePerDay * nights).toLocaleString()} ({nights} × ฿
              {pricePerDay.toLocaleString()})
            </div>
          ) : null}
          <div style={{ marginTop: 2 }}>
            ข้อมูลทั้งหมดจะถูกส่งให้ร้านเมื่อกดทักทาย LINE
          </div>
        </div>
      ) : nights === 0 && !hasConflict ? (
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
          กรอกวันที่ก่อนเพื่อให้ร้านตอบเร็วขึ้น (หรือทักหาร้านได้เลยถ้ายังไม่แน่ใจ)
        </div>
      ) : null}

      {nights > 0 && !hasConflict ? (
        isLoggedIn && lineHref ? (
          <a
            href={lineHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackAndGo}
            style={{
              display: "block",
              marginTop: 12,
              padding: "12px 16px",
              background: "var(--line-green)",
              color: "var(--on-dark)",
              borderRadius: 6,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            จองวันนี้ผ่าน LINE · {nights} วัน
          </a>
        ) : (
          // Anonymous viewer — bounce to login, never expose LINE URL.
          <Link
            href={`/login?next=${encodeURIComponent(loginNext || "/")}`}
            style={{
              display: "block",
              marginTop: 12,
              padding: "12px 16px",
              background: "var(--ink)",
              color: "var(--on-dark)",
              borderRadius: 6,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            เข้าสู่ระบบเพื่อจอง · {nights} วัน
          </Link>
        )
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

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ink-3)",
  fontWeight: 500,
  letterSpacing: "0.02em",
};

/**
 * Explicit height + appearance reset so native iOS / Android date inputs render
 * at the same compact size as text inputs across platforms. Font-size 16 prevents
 * iOS auto-zoom on focus.
 */
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  margin: "5px 0",
  border: "1px solid var(--line)",
  borderRadius: 6,
  fontSize: 15,
  background: "var(--surface)",
  color: "var(--ink)",
  fontFamily: "inherit",
  lineHeight: 1.4,
  boxSizing: "border-box",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
};
