"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import ProductCard from "./ProductCard";
import { AREAS } from "@/lib/areas";
import { haversineKm } from "@/lib/geo";
import { useUserLocation } from "./LocationProvider";
import type { Product } from "@/lib/types";
import { t, type Locale } from "@/lib/i18n";

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

export default function ProductResults({
  products,
  savedIds,
  isLoggedIn,
  total,
  hasMore: initialHasMore,
  searchParams = {},
  locale = "th",
}: {
  products: Product[];
  savedIds: string[];
  isLoggedIn: boolean;
  total?: number;
  hasMore?: boolean;
  searchParams?: SearchParams;
  locale?: Locale;
}) {
  const { loc, radius } = useUserLocation();
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  // Infinite scroll state
  const [allProducts, setAllProducts] = useState<Product[]>(products);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when products prop changes (filter change)
  useEffect(() => {
    setAllProducts(products);
    setPage(2);
    setHasMore(initialHasMore ?? false);
  }, [products, initialHasMore]);

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

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { items: Product[]; hasMore: boolean };
      setAllProducts((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage((p) => p + 1);
    } catch (err) {
      console.error("[ProductResults] fetchMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, searchParams]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // The app scrolls inside a nested overflow container (#main in
    // app/layout.tsx), not the window. rootMargin only expands the rect of
    // the observer's root — with the default (document) root the sentinel is
    // clipped by the scroll container first, so prefetching would never
    // trigger early. Use the actual scroll container as root.
    const getScrollParent = (el: HTMLElement): HTMLElement | null => {
      let p = el.parentElement;
      while (p) {
        const { overflowY } = getComputedStyle(p);
        if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return p;
        p = p.parentElement;
      }
      return null;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchMore();
        }
      },
      // Large rootMargin prefetches the next page ~1500px before the user
      // reaches the end of the grid. Near the very bottom the sticky filter
      // sidebar / results bar are "parked" against their containing block's
      // bottom edge, so appending items there would visibly shift them.
      // Loading early keeps the append below the viewport while they are
      // still stuck.
      { root: getScrollParent(sentinel), rootMargin: "1500px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchMore]);

  const list = useMemo(() => {
    let rows = allProducts.map((d) => {
      const a = d.area_key ? AREAS[d.area_key] : undefined;
      const km = loc && a ? haversineKm(loc.lat, loc.lng, a.lat, a.lng) : null;
      return { d, km };
    });
    if (loc && radius != null) {
      rows = rows.filter((r) => r.km != null && r.km <= radius);
      rows.sort((x, y) => (x.km == null ? 1 : y.km == null ? -1 : x.km - y.km));
    }
    return rows;
  }, [allProducts, loc, radius]);

  return (
    <div>
      {list.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-3)", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)" }}>
          {t("results.noneInRadius", locale)}
        </div>
      ) : (
        <>
          <div className="grid-3" style={{ gap: "24px 20px" }}>
            {list.map(({ d }, i) => (
              <ProductCard key={d.id} product={d} variant={i} savedSet={savedSet} isLoggedIn={isLoggedIn} />
            ))}
          </div>

          {/* Infinite scroll sentinel + reserved loader area.
              Fixed height that is always present while more pages exist, so
              mounting/unmounting the spinner causes zero layout shift (which
              would otherwise nudge the sticky filter sidebar / results bar). */}
          {hasMore && (
            <div
              ref={sentinelRef}
              aria-hidden={!loadingMore}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                height: 76,
                color: "var(--ink-3)",
                visibility: loadingMore ? "visible" : "hidden",
              }}
            >
              <LoadingSpinner />
              <span style={{ fontSize: 13 }}>{t("results.loading", locale)}</span>
            </div>
          )}

          {/* End of results */}
          {!hasMore && !loadingMore && allProducts.length > 0 && (
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
                {allProducts.length > 1
                  ? t("results.allShown", locale).replace("{n}", String(allProducts.length))
                  : t("results.noMore", locale)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
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
