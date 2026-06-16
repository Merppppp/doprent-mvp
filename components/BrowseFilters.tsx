"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PriceRange from "./PriceRange";
import type { SelectOption } from "./SearchSelect";
import { t, type Locale } from "@/lib/i18n";
import type { BoundTagGroup } from "@/lib/tag-groups";
import { SIZES, sizeLabel } from "@/lib/types";

export type BrowseFiltersProps = {
  q: string;
  color?: string | null;
  occasion: string | null;
  size: string | null;
  designer: string | null;
  priceMin: number;
  priceMax: number;
  priceBounds: { min: number; max: number };
  occasions: SelectOption[];
  colors?: SelectOption[];
  sizes: SelectOption[];
  designers: SelectOption[];
  locale?: Locale;
  /** Bound tag groups for the current product type (from DB, server-fetched). */
  tagGroups?: BoundTagGroup[];
  /** Active tag selections keyed by group key, values are tag keys. */
  activeTags?: Record<string, string[]>;
  /** Body-measurement filter bounds (ซม.) */
  bustMin?: number;
  bustMax?: number;
  waistMin?: number;
  waistMax?: number;
  lengthMin?: number;
  lengthMax?: number;
};

// ── Chip + Section helpers ────────────────────────────────────────────────────
// NOTE: The "ประเภทชุด" (dress-type) filter section previously had a hardcoded
// DRESS_TYPE_GROUPS client-side list here. It has been removed — dress-type is
// now a DB-backed TagGroup (key='dress-type') bound to the dress product type via
// product_type_tag_groups. It will appear automatically in the dynamic
// tagGroups sections rendered by the bound-tag-group facet above.

function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full p-0 border-none bg-transparent cursor-pointer font-[inherit]"
    >
      <span className="text-xs font-bold text-[var(--ink)]">{label}</span>
      <span
        className={`text-[11px] text-[var(--ink-3)] inline-block transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
      >
        ▼
      </span>
    </button>
  );
}

function SelectedBadge({
  label,
  onRemove,
  removeAria,
}: {
  label: string;
  onRemove: () => void;
  removeAria: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/40 text-[11px] font-medium text-[var(--accent)] whitespace-nowrap">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeAria}: ${label}`}
        className="w-4 h-4 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-150 text-[10px] leading-none font-[inherit]"
      >
        ✕
      </button>
    </span>
  );
}

function SectionSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--accent)] font-[inherit]"
      />
    </div>
  );
}

type SearchableItem = {
  value: string;
  label: string;
  /** Extra text (th + en labels) matched against the search query. */
  searchText: string;
};

const VISIBLE_COUNT = 6;

/**
 * Searchable chip list: search input + first 6 chips + "show all (N)" toggle.
 * While a query is typed, every match is shown (expand state is ignored).
 */
function SearchableChipSection({
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

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-[11px] cursor-pointer font-[inherit] transition-all duration-150 whitespace-nowrap text-center border ${
        active
          ? "bg-[var(--accent)] text-white font-semibold border-[var(--accent)]"
          : "bg-[var(--surface)] text-[var(--ink-2)] font-normal border-[var(--line)]"
      }`}
    >
      {label}
    </button>
  );
}

function ColorSwatch({
  value,
  label,
  hex,
  active,
  onClick,
}: {
  value: string;
  label: string;
  hex: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md cursor-pointer font-[inherit] transition-all duration-150 ${
        active
          ? "border border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border border-[var(--line)] bg-[var(--surface)]"
      }`}
    >
      <span
        className="w-3.5 h-3.5 rounded-full shrink-0 inline-block"
        style={{
          background: hex,
          border: hex === "#FFFFFF" || hex === "#FFFDD0" ? "1px solid var(--line)" : "none",
        }}
      />
      <span className={`text-[11px] ${active ? "text-[var(--accent)] font-semibold" : "text-[var(--ink-2)] font-normal"}`}>
        {label}
      </span>
    </button>
  );
}

/** Chip list for a bound tag group — supports single and multi select.
 *  Renders swatches (image > hex > plain chip) when swatch data is present.
 *  For groups with more than VISIBLE_COUNT tags: shows a per-group search input
 *  and a "show all / show less" collapse toggle, mirroring SearchableChipSection. */
function TagGroupSection({
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

// ── Main component ────────────────────────────────────────────────────────────

export default function BrowseFilters(props: BrowseFiltersProps) {
  const locale = props.locale ?? "th";
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

  /** Toggle a tag within a group in the URL (comma-separated), respecting selectionMode. */
  const setTagParam = useCallback(
    (groupKey: string, tagKey: string, selectionMode: "single" | "multi") => {
      push((sp) => {
        const current = sp.get(groupKey)?.split(",").filter(Boolean) ?? [];
        let next: string[];
        if (selectionMode === "single") {
          next = current.includes(tagKey) ? [] : [tagKey];
        } else {
          next = current.includes(tagKey)
            ? current.filter((k) => k !== tagKey)
            : [...current, tagKey];
        }
        if (next.length === 0) sp.delete(groupKey);
        else sp.set(groupKey, next.join(","));
      });
    },
    [push],
  );

  // Section open/close state
  const [sections, setSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { occasion: true, color: false, size: false, price: true, measurements: false };
    (props.tagGroups ?? []).forEach((g, i) => { init[`tg_${g.groupKey}`] = i === 0; });
    return init;
  });

  const toggleSection = (key: string) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const hasAny =
    !!props.occasion ||
    !!props.size ||
    !!props.designer ||
    !!props.q ||
    Object.values(props.activeTags ?? {}).some((arr) => arr.length > 0) ||
    props.priceMin > props.priceBounds.min ||
    props.priceMax < props.priceBounds.max ||
    props.bustMin !== undefined || props.bustMax !== undefined ||
    props.waistMin !== undefined || props.waistMax !== undefined ||
    props.lengthMin !== undefined || props.lengthMax !== undefined;

  // ── Searchable items (match both th + en labels) ──────────────────────────
  const occasionItems: SearchableItem[] = useMemo(
    () =>
      props.occasions.map((o) => ({
        value: o.value,
        label: o.label,
        searchText: [o.value, o.label, t(`occasion.${o.value}`, "th"), t(`occasion.${o.value}`, "en")].join(" "),
      })),
    [props.occasions],
  );

  // ── Selected filter badges (top of sidebar) ───────────────────────────────
  const selectedBadges: { key: string; label: string; onRemove: () => void }[] = [];
  if (props.q) {
    selectedBadges.push({ key: "q", label: `"${props.q}"`, onRemove: () => setParam("q", null) });
  }
  // Dynamic tag group badges (when tagGroups provided, replace hardcoded occasion badge)
  if (props.tagGroups?.length) {
    for (const group of props.tagGroups) {
      const activeTgs = props.activeTags?.[group.groupKey] ?? [];
      for (const tagKey of activeTgs) {
        const tag = group.tags.find((t) => t.key === tagKey);
        selectedBadges.push({
          key: `tg_${group.groupKey}_${tagKey}`,
          label: tag?.label ?? tagKey,
          onRemove: () =>
            push((sp) => {
              const current = sp.get(group.groupKey)?.split(",").filter(Boolean) ?? [];
              const next = current.filter((k) => k !== tagKey);
              if (next.length === 0) sp.delete(group.groupKey);
              else sp.set(group.groupKey, next.join(","));
            }),
        });
      }
    }
  } else if (props.occasion) {
    const occ = props.occasions.find((o) => o.value === props.occasion);
    selectedBadges.push({
      key: "occasion",
      label: occ?.label ?? props.occasion,
      onRemove: () => setParam("occasion", null),
    });
  }
  if (props.size) {
    selectedBadges.push({ key: "size", label: sizeLabel(props.size), onRemove: () => setParam("size", null) });
  }
  if (props.designer) {
    selectedBadges.push({
      key: "designer",
      label: props.designer,
      onRemove: () => setParam("designer", null),
    });
  }
  if (props.priceMin > props.priceBounds.min || props.priceMax < props.priceBounds.max) {
    selectedBadges.push({
      key: "price",
      label: `฿${props.priceMin.toLocaleString()}–฿${props.priceMax.toLocaleString()}`,
      onRemove: () =>
        push((sp) => {
          sp.delete("priceMin");
          sp.delete("priceMax");
        }),
    });
  }
  // Body-measurement filter badges
  if (props.bustMin !== undefined || props.bustMax !== undefined) {
    const lo = props.bustMin ?? ""; const hi = props.bustMax ?? "";
    selectedBadges.push({
      key: "bust",
      label: `${t("filter.bust", locale)} ${lo}–${hi} ${t("unit.cm", locale)}`,
      onRemove: () => push((sp) => { sp.delete("bustMin"); sp.delete("bustMax"); }),
    });
  }
  if (props.waistMin !== undefined || props.waistMax !== undefined) {
    const lo = props.waistMin ?? ""; const hi = props.waistMax ?? "";
    selectedBadges.push({
      key: "waist",
      label: `${t("filter.waist", locale)} ${lo}–${hi} ${t("unit.cm", locale)}`,
      onRemove: () => push((sp) => { sp.delete("waistMin"); sp.delete("waistMax"); }),
    });
  }
  if (props.lengthMin !== undefined || props.lengthMax !== undefined) {
    const lo = props.lengthMin ?? ""; const hi = props.lengthMax ?? "";
    selectedBadges.push({
      key: "length",
      label: `${t("filter.length", locale)} ${lo}–${hi} ${t("unit.cm", locale)}`,
      onRemove: () => push((sp) => { sp.delete("lengthMin"); sp.delete("lengthMax"); }),
    });
  }

  return (
    <div className="flex flex-col">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[var(--ink)]">
          {t("filter.title", locale)}
        </span>
        {hasAny ? (
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            className="text-xs text-[var(--accent)] bg-transparent border-none cursor-pointer font-[inherit] font-medium"
          >
            {t("filter.clearAll", locale)}
          </button>
        ) : null}
      </div>

      {/* ════ Selected filters zone ════ */}
      {selectedBadges.length > 0 && (
        <div className="pb-3 border-b border-[var(--line)]/50 mb-1">
          <div className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wider mb-2">
            {t("filter.selected", locale)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedBadges.map((b) => (
              <SelectedBadge
                key={b.key}
                label={b.label}
                onRemove={b.onRemove}
                removeAria={t("filter.removeFilter", locale)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ════ Dynamic tag group sections (data-driven from bound tag groups) ════ */}
      {props.tagGroups?.length ? (
        props.tagGroups.map((group) => (
          <div key={group.groupKey} className="py-3 border-b border-[var(--line)]/50">
            <SectionHeader
              label={group.groupLabel}
              open={!!sections[`tg_${group.groupKey}`]}
              onToggle={() => toggleSection(`tg_${group.groupKey}`)}
            />
            {!!sections[`tg_${group.groupKey}`] && (
              <TagGroupSection
                tags={group.tags}
                active={props.activeTags?.[group.groupKey] ?? []}
                selectionMode={group.selectionMode}
                onToggle={(tagKey) => setTagParam(group.groupKey, tagKey, group.selectionMode)}
                locale={locale}
              />
            )}
          </div>
        ))
      ) : (
        /* ════ Fallback: hardcoded Occasion section ════ */
        <div className="py-3 border-b border-[var(--line)]/50">
          <SectionHeader
            label={t("filter.occasion", locale)}
            open={!!sections.occasion}
            onToggle={() => toggleSection("occasion")}
          />
          {!!sections.occasion && (
            <SearchableChipSection
              items={occasionItems}
              active={props.occasion}
              onSelect={(value) => setParam("occasion", value)}
              searchPlaceholder={t("filter.searchOccasion", locale)}
              locale={locale}
            />
          )}
        </div>
      )}

      {/* ════ Section: Size ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={t("filter.size", locale)}
          open={sections.size}
          onToggle={() => toggleSection("size")}
        />
        {sections.size && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {SIZES.map((sz) => (
              <Chip
                key={sz}
                label={sizeLabel(sz)}
                active={props.size === sz}
                onClick={() => setParam("size", props.size === sz ? null : sz)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ════ Section: Body Measurements ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={`${t("filter.bodyMeasurements", locale)} (${t("unit.cm", locale)})`}
          open={!!sections.measurements}
          onToggle={() => toggleSection("measurements")}
        />
        {!!sections.measurements && (
          <div className="flex flex-col gap-3 mt-3">
            {(
              [
                {
                  label: t("filter.bust", locale),
                  minKey: "bustMin" as const,
                  maxKey: "bustMax" as const,
                  minVal: props.bustMin,
                  maxVal: props.bustMax,
                },
                {
                  label: t("filter.waist", locale),
                  minKey: "waistMin" as const,
                  maxKey: "waistMax" as const,
                  minVal: props.waistMin,
                  maxVal: props.waistMax,
                },
                {
                  label: t("filter.length", locale),
                  minKey: "lengthMin" as const,
                  maxKey: "lengthMax" as const,
                  minVal: props.lengthMin,
                  maxVal: props.lengthMax,
                },
              ] as const
            ).map(({ label, minKey, maxKey, minVal, maxVal }) => (
              <div key={minKey}>
                <div className="text-[11px] font-medium text-[var(--ink-2)] mb-1.5">{label}</div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="ต่ำสุด"
                    value={minVal ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setParam(minKey, v === "" ? null : v);
                    }}
                    className="w-full px-2 py-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--accent)] font-[inherit] text-center"
                  />
                  <span className="text-[10px] text-[var(--ink-3)] shrink-0">–</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="สูงสุด"
                    value={maxVal ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setParam(maxKey, v === "" ? null : v);
                    }}
                    className="w-full px-2 py-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--accent)] font-[inherit] text-center"
                  />
                  <span className="text-[10px] text-[var(--ink-3)] shrink-0">{t("unit.cm", locale)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════ Section: Price / Day ════ */}
      <div className="py-3">
        <SectionHeader
          label={t("filter.price", locale)}
          open={sections.price}
          onToggle={() => toggleSection("price")}
        />
        {sections.price && (
          <div className="mt-3">
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
        )}
      </div>
    </div>
  );
}
