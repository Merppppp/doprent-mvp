"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchSelect, { type SelectOption } from "./SearchSelect";
import PriceRange from "./PriceRange";

export type BrowseFiltersProps = {
  q: string;
  color: string | null;
  occasion: string | null;
  size: string | null;
  designer: string | null;
  priceMin: number;
  priceMax: number;
  priceBounds: { min: number; max: number };
  occasions: SelectOption[];
  colors: SelectOption[];
  sizes: SelectOption[];
  designers: SelectOption[];
};

export default function BrowseFilters(props: BrowseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const push = useCallback(
    (mut: (sp: URLSearchParams) => void) => {
      const sp = new URLSearchParams(params.toString());
      mut(sp);
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      push((sp) => {
        if (value == null || value === "") sp.delete(key);
        else sp.set(key, value);
      });
    },
    [push],
  );

  // Debounced free-text search.
  const [q, setQ] = useState(props.q);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => setParam("q", q.trim() || null), 400);
    return () => clearTimeout(t);
  }, [q, setParam]);

  const hasAny =
    !!props.color ||
    !!props.occasion ||
    !!props.size ||
    !!props.designer ||
    !!props.q ||
    props.priceMin > props.priceBounds.min ||
    props.priceMax < props.priceBounds.max;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600, color: "var(--ink-3)" }}>ค้นหา</div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ชื่อชุด, ดีไซเนอร์…"
          style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", fontSize: 14, color: "var(--ink)" }}
        />
      </div>

      <SearchSelect label="โอกาส" value={props.occasion} options={props.occasions} onChange={(v) => setParam("occasion", v)} />
      <SearchSelect label="ดีไซเนอร์" value={props.designer} options={props.designers} onChange={(v) => setParam("designer", v)} />
      <SearchSelect label="สี" value={props.color} options={props.colors} onChange={(v) => setParam("color", v)} />
      <SearchSelect label="ขนาด" value={props.size} options={props.sizes} searchable={false} onChange={(v) => setParam("size", v)} />

      <div>
        <div style={{ fontSize: 12, marginBottom: 10, fontWeight: 600, color: "var(--ink-3)" }}>ราคา / วัน</div>
        <PriceRange
          min={props.priceBounds.min}
          max={props.priceBounds.max}
          step={100}
          lo={props.priceMin}
          hi={props.priceMax}
          onCommit={(lo, hi) =>
            push((sp) => {
              if (lo <= props.priceBounds.min) sp.delete("priceMin");
              else sp.set("priceMin", String(lo));
              if (hi >= props.priceBounds.max) sp.delete("priceMax");
              else sp.set("priceMax", String(hi));
            })
          }
        />
      </div>

      {hasAny ? (
        <button
          type="button"
          onClick={() => router.push(pathname, { scroll: false })}
          style={{ padding: 9, border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink-2)", fontWeight: 500, background: "var(--surface)", cursor: "pointer" }}
        >
          ล้างตัวกรองทั้งหมด
        </button>
      ) : null}
    </div>
  );
}
