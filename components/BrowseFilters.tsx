"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PriceRange from "./PriceRange";
import type { SelectOption } from "./SearchSelect";
import { t, type Locale } from "@/lib/i18n";
import type { BoundTagGroup } from "@/lib/tag-groups";
import { SIZES, sizeLabel } from "@/lib/types";
import { SectionHeader } from "./browse-filters/SectionHeader";
import { SelectedBadge } from "./browse-filters/SelectedBadge";
import { SearchableChipSection } from "./browse-filters/SearchableChipSection";
import { TagGroupSection } from "./browse-filters/TagGroupSection";
import { Chip } from "./browse-filters/Chip";
import type { SearchableItem } from "./browse-filters/types";

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
  openOnly?: boolean;
};

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
    !!props.openOnly ||
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
  if (props.openOnly) {
    selectedBadges.push({ key: "openOnly", label: "ร้านเปิดอยู่", onRemove: () => setParam("openOnly", null) });
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

      {/* ════ Open shops toggle ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
            {t("filter.openOnly", locale)}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={!!props.openOnly}
            onClick={() => setParam("openOnly", props.openOnly ? null : "1")}
            className="relative shrink-0"
            style={{
              width: 40,
              height: 22,
              borderRadius: 999,
              border: "none",
              background: props.openOnly ? "var(--accent)" : "var(--line)",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: props.openOnly ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "var(--on-dark)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transition: "left 0.2s",
              }}
            />
          </button>
        </label>
      </div>

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
