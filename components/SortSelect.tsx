"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { t, type Locale } from "@/lib/i18n";

function SortSelectInner({ locale = "th" }: { locale?: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "featured";

  const SORT_OPTIONS = [
    { value: "featured",    labelKey: "sort.featured" },
    { value: "price-asc",   labelKey: "sort.priceAsc" },
    { value: "price-desc",  labelKey: "sort.priceDesc" },
    { value: "rating-desc", labelKey: "sort.ratingDesc" },
  ] as const;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "featured") {
      params.delete("sort");
    } else {
      params.set("sort", e.target.value);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="sort-group" style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span className="sort-label" style={{ fontSize: 13, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
        {t("sort.label", locale)}
      </span>
      <select
        value={current}
        onChange={handleChange}
        aria-label={t("sort.label", locale)}
        className="sort-select"
        style={{
          padding: "5px 8px",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--bg)",
          fontSize: 13,
          color: "var(--ink)",
          fontFamily: "inherit",
          maxWidth: 160,
          minWidth: 0,
          height: 34,
          cursor: "pointer",
          outline: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{t(o.labelKey, locale)}</option>
        ))}
      </select>
    </div>
  );
}

export default function SortSelect({ locale = "th" }: { locale?: Locale }) {
  return (
    <Suspense fallback={null}>
      <SortSelectInner locale={locale} />
    </Suspense>
  );
}
