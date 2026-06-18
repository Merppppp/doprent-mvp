"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { SectionSearchInput } from "./SectionSearchInput";
import { ColorSwatch } from "./ColorSwatch";
import { Chip } from "./Chip";
import { VISIBLE_COUNT } from "./types";

/** Chip list for a bound tag group — supports single and multi select.
 *  Renders swatches (image > hex > plain chip) when swatch data is present.
 *  For groups with more than VISIBLE_COUNT tags: shows a per-group search input
 *  and a "show all / show less" collapse toggle, mirroring SearchableChipSection. */
export function TagGroupSection({
  tags,
  active,
  selectionMode,
  onToggle,
  locale,
}: {
  tags: Array<{ id: string; key: string; label: string; swatchHex?: string | null; swatchImageUrl?: string | null }>;
  active: string[];
  selectionMode: "single" | "multi";
  onToggle: (tagKey: string) => void;
  locale: Locale;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const showSearch = tags.length > VISIBLE_COUNT;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? tags.filter((tag) =>
        tag.label.toLowerCase().includes(q) || tag.key.toLowerCase().includes(q)
      )
    : tags;
  // While a query is typed, show all matches (ignore collapsed state).
  const visible = showSearch && !q && !expanded ? filtered.slice(0, VISIBLE_COUNT) : filtered;
  const hiddenCount = tags.length - VISIBLE_COUNT;

  function renderTag(tag: typeof tags[number]) {
    const isActive = active.includes(tag.key);
    if (tag.swatchImageUrl) {
      return (
        <button
          key={tag.key}
          type="button"
          onClick={() => onToggle(tag.key)}
          className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md cursor-pointer font-[inherit] transition-all duration-150 ${
            isActive
              ? "border border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border border-[var(--line)] bg-[var(--surface)]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tag.swatchImageUrl} alt="" className="w-3.5 h-3.5 rounded-full shrink-0 object-cover" />
          <span className={`text-[11px] ${isActive ? "text-[var(--accent)] font-semibold" : "text-[var(--ink-2)] font-normal"}`}>{tag.label}</span>
        </button>
      );
    }
    if (tag.swatchHex) {
      return (
        <ColorSwatch
          key={tag.key}
          value={tag.key}
          label={tag.label}
          hex={tag.swatchHex}
          active={isActive}
          onClick={() => onToggle(tag.key)}
        />
      );
    }
    return (
      <Chip
        key={tag.key}
        label={tag.label}
        active={isActive}
        onClick={() => onToggle(tag.key)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {showSearch && (
        <SectionSearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("filter.searchTags", locale)}
        />
      )}
      {visible.length === 0 ? (
        <div className="text-[11px] text-[var(--ink-3)] py-1.5 text-center">
          {t("filter.noResults", locale)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {visible.map((tag) => renderTag(tag))}
        </div>
      )}
      {showSearch && !q && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-[var(--accent)] bg-transparent border-none cursor-pointer font-[inherit] font-medium text-left p-0"
        >
          {expanded
            ? t("filter.showLess", locale)
            : t("filter.showAll", locale).replace("{n}", String(tags.length))}
        </button>
      )}
    </div>
  );
}
