"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShopCover } from "@/components/ProductArt";
import VerifiedBadge from "@/components/VerifiedBadge";
import { AREA_LIST, AREAS } from "@/lib/areas";
import { formatKm, haversineKm } from "@/lib/geo";
import { useUserLocation } from "./LocationProvider";
import type { Color } from "@/lib/types";

export type FinderShop = {
  id: string;
  slug: string;
  name: string;
  areaKey: string | null;
  areaLabel: string;
  coverColor: Color;
  featured: boolean;
  verified: boolean;
  tag: string | null;
  sinceYear: number | null;
  instagram: string | null;
};

type SortMode = "near" | "default";

export default function ShopFinder({ shops }: { shops: FinderShop[] }) {
  const { loc, label, source, status, requestGps, setArea, clear } = useUserLocation();
  const [sort, setSort] = useState<SortMode>("near");

  const withDist = useMemo(() => {
    const rows = shops.map((s) => {
      const a = s.areaKey ? AREAS[s.areaKey] : undefined;
      const km = loc && a ? haversineKm(loc.lat, loc.lng, a.lat, a.lng) : null;
      return { shop: s, km };
    });
    if (loc && sort === "near") {
      rows.sort((x, y) => {
        if (x.km == null) return 1;
        if (y.km == null) return -1;
        return x.km - y.km;
      });
    }
    return rows;
  }, [shops, loc, sort]);

  return (
    <div>
      {/* Location control bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "12px 14px",
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--surface)",
          marginBottom: 20,
        }}
      >
        {loc ? (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
              <Pin /> ใกล้ {label}
              {source === "gps" ? <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>(GPS)</span> : null}
            </span>
            <div style={{ display: "inline-flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setSort(sort === "near" ? "default" : "near")} style={chipBtn(sort === "near")}>
                {sort === "near" ? "เรียง: ใกล้สุด" : "เรียง: แนะนำ"}
              </button>
              <button type="button" onClick={clear} style={chipBtn(false)}>
                เปลี่ยน
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" onClick={requestGps} disabled={status === "loading"} style={primaryBtn}>
              <Pin /> {status === "loading" ? "กำลังหาตำแหน่ง…" : "หาร้านใกล้ฉัน"}
            </button>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>หรือเลือกย่าน</span>
            <select
              defaultValue=""
              onChange={(e) => e.target.value && setArea(e.target.value)}
              aria-label="เลือกย่านของคุณ"
              style={{
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 8,
                background: "var(--bg)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              <option value="" disabled>
                เลือกย่าน…
              </option>
              {AREA_LIST.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.th}
                </option>
              ))}
            </select>
            {status === "denied" ? (
              <span style={{ fontSize: 12, color: "var(--ink-3)", flexBasis: "100%" }}>
                เปิดสิทธิ์ตำแหน่งไม่ได้ เลือกย่านด้านบนแทนได้
              </span>
            ) : null}
          </>
        )}
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {withDist.map(({ shop: b, km }) => (
          <Link
            key={b.id}
            href={`/shop/${b.slug}`}
            className="boutique-card"
            style={{
              background: "var(--surface)",
              border: `1px solid ${b.featured ? "var(--gold)" : "var(--line)"}`,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <div className="cover">
              <ShopCover color={b.coverColor} />
            </div>
            <div style={{ padding: 22, flex: 1 }}>
              {b.featured ? (
                <span className="ad-badge featured" style={{ position: "static", display: "inline-flex", marginBottom: 8 }}>
                  <span className="dot" />
                  Featured
                </span>
              ) : null}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span>{b.areaLabel}</span>
                {km != null ? (
                  <span style={{ color: "var(--accent-2)", fontWeight: 600 }}>· ~{formatKm(km)}</span>
                ) : null}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {b.name}
                {b.verified ? <VerifiedBadge size="sm" /> : null}
              </h3>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.5 }}>{b.tag}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {b.sinceYear ? <span>ตั้งแต่ {b.sinceYear}</span> : null}
                {b.instagram ? <span>· {b.instagram}</span> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
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

function chipBtn(active: boolean): React.CSSProperties {
  return {
    padding: "7px 13px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
    background: active ? "var(--accent-soft)" : "var(--bg)",
    color: active ? "var(--accent-2)" : "var(--ink-2)",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  };
}
