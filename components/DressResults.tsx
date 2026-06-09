"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import DressCard from "./DressCard";
import { AREA_LIST, AREAS } from "@/lib/areas";
import { haversineKm } from "@/lib/geo";
import { useUserLocation } from "./LocationProvider";
import type { Dress } from "@/lib/types";

const RADII = [3, 5, 10] as const;

type SearchParams = {
  q?: string;
  color?: string;
  occasion?: string;
  size?: string;
  designer?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: string;
  priceMax?: string;
};

export default function DressResults({
  dresses,
  savedIds,
  isLoggedIn,
  total,
  hasMore: initialHasMore,
  searchParams = {},
}: {
  dresses: Dress[];
  savedIds: string[];
  isLoggedIn: boolean;
  total?: number;
  hasMore?: boolean;
  searchParams?: SearchParams;
}) {
  const { loc, label, source, status, requestGps, setArea, clear } = useUserLocation();
  const [radius, setRadius] = useState<number | null>(null);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  // Infinite scroll state
  const [allDresses, setAllDresses] = useState<Dress[]>(dresses);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when dresses prop changes (filter change)
  useEffect(() => {
    setAllDresses(dresses);
    setPage(2);
    setHasMore(initialHasMore ?? false);
  }, [dresses, initialHasMore]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (searchParams.q) params.set("q", searchParams.q);
      if (searchParams.color) params.set("color", searchParams.color);
      if (searchParams.occasion) params.set("occasion", searchParams.occasion);
      if (searchParams.size) params.set("size", searchParams.size);
      if (searchParams.designer) params.set("designer", searchParams.designer);
      if (searchParams.sort) params.set("sort", searchParams.sort);
      if (searchParams.dateFrom) params.set("dateFrom", searchParams.dateFrom);
      if (searchParams.dateTo) params.set("dateTo", searchParams.dateTo);
      if (searchParams.priceMin) params.set("priceMin", searchParams.priceMin);
      if (searchParams.priceMax) params.set("priceMax", searchParams.priceMax);
      params.set("page", String(page));

      const res = await fetch(`/api/dresses?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { items: Dress[]; hasMore: boolean };
      setAllDresses((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage((p) => p + 1);
    } catch (err) {
      console.error("[DressResults] fetchMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, searchParams]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchMore]);

  const list = useMemo(() => {
    let rows = allDresses.map((d) => {
      const a = d.area_key ? AREAS[d.area_key] : undefined;
      const km = loc && a ? haversineKm(loc.lat, loc.lng, a.lat, a.lng) : null;
      return { d, km };
    });
    if (loc && radius != null) rows = rows.filter((r) => r.km != null && r.km <= radius);
    if (loc) {
      rows.sort((x, y) => (x.km == null ? 1 : y.km == null ? -1 : x.km - y.km));
    }
    return rows;
  }, [allDresses, loc, radius]);

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
              <option value="" disabled>เลือกเขต…</option>
              {AREA_LIST.map((a) => (
                <option key={a.key} value={a.key}>{a.th}</option>
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
        <>
          <div className="grid-3" style={{ gap: "24px 20px" }}>
            {list.map(({ d }, i) => (
              <DressCard key={d.id} dress={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {/* Loading spinner */}
          {loadingMore && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "28px 0", color: "var(--ink-3)" }}>
              <LoadingSpinner />
              <span style={{ fontSize: 13 }}>กำลังโหลด...</span>
            </div>
          )}

          {/* End of results */}
          {!hasMore && !loadingMore && allDresses.length > 0 && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--ink-3)",
                padding: "8px 20px",
                border: "1px solid var(--line)",
                borderRadius: 999,
                background: "var(--surface)",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
                {allDresses.length > 1 ? `แสดงครบทั้ง ${allDresses.length} ชุดแล้ว` : "หมดแล้ว"}
              </span>
            </div>
          )}
        </>
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

function LoadingSpinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      style={{ animation: "dr-spin 0.8s linear infinite" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `@keyframes dr-spin{to{transform:rotate(360deg)}}` }} />
      <path d="M12 2a10 10 0 0 1 10 10" opacity="0.9" />
      <path d="M12 2a10 10 0 0 0-10 10" opacity="0.25" />
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
