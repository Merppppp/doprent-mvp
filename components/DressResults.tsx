"use client";

import { useMemo, useState } from "react";
import DressCard from "./DressCard";
import { AREA_LIST, AREAS } from "@/lib/areas";
import { haversineKm } from "@/lib/geo";
import { useUserLocation } from "./LocationProvider";
import type { Dress } from "@/lib/types";

const RADII = [3, 5, 10] as const;

/**
 * Client wrapper for the /browse results grid: shows distance on each dress,
 * lets the visitor set a location (GPS or area), filter by radius, and sort
 * nearest-first. Server still does all category filtering; this is the
 * distance layer on top.
 */
export default function DressResults({
  dresses,
  savedIds,
  isLoggedIn,
}: {
  dresses: Dress[];
  savedIds: string[];
  isLoggedIn: boolean;
}) {
  const { loc, label, source, status, requestGps, setArea, clear } = useUserLocation();
  const [radius, setRadius] = useState<number | null>(null);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const list = useMemo(() => {
    let rows = dresses.map((d) => {
      const a = d.area_key ? AREAS[d.area_key] : undefined;
      const km = loc && a ? haversineKm(loc.lat, loc.lng, a.lat, a.lng) : null;
      return { d, km };
    });
    if (loc && radius != null) rows = rows.filter((r) => r.km != null && r.km <= radius);
    if (loc) {
      rows.sort((x, y) => (x.km == null ? 1 : y.km == null ? -1 : x.km - y.km));
    }
    return rows;
  }, [dresses, loc, radius]);

  return (
    <div>
      {/* Distance toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "10px 12px",
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--surface)",
          marginBottom: 18,
        }}
      >
        {loc ? (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }}>
              <Pin /> ใกล้ {label}
              {source === "gps" ? <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>(GPS)</span> : null}
            </span>
            <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>ในระยะ</span>
              {RADII.map((r) => (
                <button key={r} type="button" onClick={() => setRadius(radius === r ? null : r)} style={chip(radius === r)}>
                  {r} กม
                </button>
              ))}
              <button type="button" onClick={() => setRadius(null)} style={chip(radius === null)}>
                ทั้งหมด
              </button>
            </div>
            <button type="button" onClick={clear} style={{ ...chip(false), marginLeft: "auto" }}>
              เปลี่ยนตำแหน่ง
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={requestGps} disabled={status === "loading"} style={primaryBtn}>
              <Pin /> {status === "loading" ? "กำลังหาตำแหน่ง…" : "ใกล้ฉัน"}
            </button>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>หรือเลือกเขต</span>
            <select
              defaultValue=""
              onChange={(e) => e.target.value && setArea(e.target.value)}
              aria-label="เลือกเขตของคุณ"
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", fontSize: 13, color: "var(--ink)" }}
            >
              <option value="" disabled>
                เลือกเขต…
              </option>
              {AREA_LIST.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.th}
                </option>
              ))}
            </select>
            {status === "denied" ? (
              <span style={{ fontSize: 12, color: "var(--ink-3)", flexBasis: "100%" }}>เปิดสิทธิ์ตำแหน่งไม่ได้ เลือกเขตแทนได้</span>
            ) : null}
          </>
        )}
      </div>

      {list.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-3)", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)" }}>
          ไม่มีชุดในระยะที่เลือก ลองขยายระยะหรือเลือก &ldquo;ทั้งหมด&rdquo;
        </div>
      ) : (
        <div className="grid-3" style={{ gap: "24px 20px" }}>
          {list.map(({ d }, i) => (
            <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      )}
    </div>
  );
}

function Pin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 16px",
  borderRadius: 999,
  border: "0",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
    background: active ? "var(--accent-soft)" : "var(--bg)",
    color: active ? "var(--accent-2)" : "var(--ink-2)",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  };
}
