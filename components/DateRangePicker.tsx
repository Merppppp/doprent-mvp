"use client";

import { useMemo, useState } from "react";

type Props = {
  /** Base LINE URL (without our query params). */
  lineUrl: string;
  /** Dress display name (used in pre-filled LINE message). */
  dressName: string;
  /** Boutique name for the LINE message. */
  boutiqueName: string;
  /** Optional dress ID to be tracked in /api/track when user clicks LINE. */
  dressId?: string;
  boutiqueId?: string;
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

const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
})();

/**
 * Renter-side date range picker. Adds optional ?date= param to the LINE deep-link
 * and renders an auto-generated Thai pre-filled message preview.
 */
export default function DateRangePicker({
  lineUrl,
  dressName,
  boutiqueName,
  dressId,
  boutiqueId,
}: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Auto-bump end to >= start when user picks a start
  const minEnd = start || TODAY;
  const nights = nightsBetween(start, end);

  const lineHref = useMemo(() => {
    if (!start || !end || nights === 0) return lineUrl;
    // Encode date in LINE param (LINE auto-fills the message field on some clients)
    const text = `สวัสดีค่ะ สนใจเช่าชุด "${dressName}" จากร้าน ${boutiqueName}\nวันที่: ${fmtThai(start)} — ${fmtThai(end)} (${nights} วัน)`;
    const sep = lineUrl.includes("?") ? "&" : "?";
    return `${lineUrl}${sep}text=${encodeURIComponent(text)}`;
  }, [lineUrl, start, end, nights, dressName, boutiqueName]);

  async function trackAndGo(e: React.MouseEvent<HTMLAnchorElement>) {
    // Don't block the click; fire-and-forget tracking
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
        // sendBeacon for async, ignored response
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track", blob);
        }
      } catch {
        // ignore
      }
    }
    // Let the <a> proceed naturally
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

      {nights > 0 ? (
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
            ระยะเวลา: {nights} วัน ({fmtThai(start)} — {fmtThai(end)})
          </div>
          <div style={{ marginTop: 2 }}>
            วันที่จะถูกส่งให้ร้านอัตโนมัติเมื่อคุณทักทาย LINE
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
          กรอกวันที่ก่อนเพื่อให้ร้านตอบเร็วขึ้น (หรือทักหาร้านได้เลยถ้ายังไม่แน่ใจ)
        </div>
      )}

      {nights > 0 ? (
        <a
          href={lineHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackAndGo}
          style={{
            display: "block",
            marginTop: 12,
            padding: "12px 16px",
            background: "#06C755",
            color: "#fff",
            borderRadius: 6,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          จองวันนี้ผ่าน LINE — {nights} วัน
        </a>
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

const inputStyle: React.CSSProperties = {
  padding: "9px 10px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  fontSize: 14,
  background: "var(--surface)",
  color: "var(--ink)",
  fontFamily: "inherit",
  width: "100%",
};
