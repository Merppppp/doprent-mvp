"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { SectionSearchInput } from "./SectionSearchInput";
import { Chip } from "./Chip";
import { type SearchableItem, VISIBLE_COUNT } from "./types";

/**
 * Searchable chip list: search input + first 6 chips + "show all (N)" toggle.
 * While a query is typed, every match is shown (expand state is ignored).
 */
export function SearchableChipSection({
  items,
  active,
  onSelect,
  searchPlaceholder,
  locale,
}: {
  items: SearchableItem[];
  active: string | null;
  onSelect: (value: string | null) => void;
  searchPlaceholder: string;
  locale: Locale;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => it.searchText.toLowerCase().includes(q))
    : items;
  const visible = q || expanded ? filtered : filtered.slice(0, VISIBLE_COUNT);
  const hiddenCount = items.length - VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <SectionSearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      {visible.length === 0 ? (
        <div className="text-[11px] text-[var(--ink-3)] py-1.5 text-center">
          {t("filter.noResults", locale)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {visible.map((it) => (
            <Chip
              key={it.value}
              label={it.label}
              active={active === it.value}
              onClick={() => onSelect(active === it.value ? null : it.value)}
            />
          ))}
        </div>
      )}
      {!q && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-[var(--accent)] bg-transparent border-none cursor-pointer font-[inherit] font-medium text-left p-0"
        >
          {expanded
            ? t("filter.showLess", locale)
            : t("filter.showAll", locale).replace("{n}", String(items.length))}
        </button>
      )}
    </div>
  );
}
