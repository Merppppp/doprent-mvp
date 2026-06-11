"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PriceRange from "./PriceRange";
import type { SelectOption } from "./SearchSelect";
import { t, DRESS_ITEM_EN, type Locale } from "@/lib/i18n";

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
  locale?: Locale;
};

// ── Dress type sub-groups (client-side URL only — no server filtering yet) ──

const DRESS_TYPE_GROUPS: {
  label: string;
  key: "top" | "bottom" | "dress";
  items: string[];
}[] = [
  {
    label: "เสื้อ",
    key: "top",
    items: ["แขนยาว", "แขนสั้น", "แขนกุด", "สายเดี่ยว", "ปาดไหล่", "เกาะอก", "เสื้อคลุม", "คอเต่า/เสื้อโค้ท", "แจ็คเก็ต", "ชีทรู"],
  },
  {
    label: "กางเกง / กระโปรง",
    key: "bottom",
    items: ["กระโปรงยาว", "กระโปรงสั้น", "กางเกงขายาว", "กางเกงขาสั้น"],
  },
  {
    label: "เดรส",
    key: "dress",
    items: ["เดรสยาว", "เดรสสั้น"],
  },
];

// ── Chip + Section helpers ────────────────────────────────────────────────────

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

  // Active filter values
  const activeType = params.get("type");

  // Section open/close state
  const [sections, setSections] = useState({
    occasion: true,
    type: false,
    color: false,
    size: false,
    price: true,
  });

  const toggleSection = (key: keyof typeof sections) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const hasAny =
    !!props.color ||
    !!props.occasion ||
    !!props.size ||
    !!props.designer ||
    !!props.q ||
    !!activeType ||
    props.priceMin > props.priceBounds.min ||
    props.priceMax < props.priceBounds.max;

  // Use existing colors from props (backed by DB color keys + swatch hex)
  const colorItems = props.colors.map((c) => ({
    value: c.value,
    label: c.label,
    hex: (c as SelectOption & { swatch?: string }).swatch ?? "#ccc",
  }));

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

  const typeItems: SearchableItem[] = useMemo(
    () =>
      DRESS_TYPE_GROUPS.flatMap((group) =>
        group.items.map((item) => ({
          value: item,
          label: locale === "en" ? (DRESS_ITEM_EN[item] ?? item) : item,
          searchText: [item, DRESS_ITEM_EN[item] ?? ""].join(" "),
        })),
      ),
    [locale],
  );

  // ── Selected filter badges (top of sidebar) ───────────────────────────────
  const selectedBadges: { key: string; label: string; onRemove: () => void }[] = [];
  if (props.q) {
    selectedBadges.push({ key: "q", label: `"${props.q}"`, onRemove: () => setParam("q", null) });
  }
  if (props.occasion) {
    const occ = props.occasions.find((o) => o.value === props.occasion);
    selectedBadges.push({
      key: "occasion",
      label: occ?.label ?? props.occasion,
      onRemove: () => setParam("occasion", null),
    });
  }
  if (activeType) {
    selectedBadges.push({
      key: "type",
      label: locale === "en" ? (DRESS_ITEM_EN[activeType] ?? activeType) : activeType,
      onRemove: () => setParam("type", null),
    });
  }
  if (props.color) {
    const col = colorItems.find((c) => c.value === props.color);
    selectedBadges.push({
      key: "color",
      label: col?.label ?? props.color,
      onRemove: () => setParam("color", null),
    });
  }
  if (props.size) {
    selectedBadges.push({ key: "size", label: props.size, onRemove: () => setParam("size", null) });
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

      {/* ════ Section: Occasion (searchable) ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={t("filter.occasion", locale)}
          open={sections.occasion}
          onToggle={() => toggleSection("occasion")}
        />
        {sections.occasion && (
          <SearchableChipSection
            items={occasionItems}
            active={props.occasion}
            onSelect={(value) => setParam("occasion", value)}
            searchPlaceholder={t("filter.searchOccasion", locale)}
            locale={locale}
          />
        )}
      </div>

      {/* ════ Section: Dress Type (searchable) ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={t("filter.type", locale)}
          open={sections.type}
          onToggle={() => toggleSection("type")}
        />
        {sections.type && (
          <SearchableChipSection
            items={typeItems}
            active={activeType}
            onSelect={(value) => setParam("type", value)}
            searchPlaceholder={t("filter.searchType", locale)}
            locale={locale}
          />
        )}
      </div>

      {/* ════ Section: Color ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={t("filter.color", locale)}
          open={sections.color}
          onToggle={() => toggleSection("color")}
        />
        {sections.color && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {colorItems.map((c) => (
              <ColorSwatch
                key={c.value}
                value={c.value}
                label={c.label}
                hex={c.hex}
                active={props.color === c.value}
                onClick={() => setParam("color", props.color === c.value ? null : c.value)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ════ Section: Size ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={t("filter.size", locale)}
          open={sections.size}
          onToggle={() => toggleSection("size")}
        />
        {sections.size && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "Free size"].map((sz) => (
              <Chip
                key={sz}
                label={sz}
                active={props.size === sz}
                onClick={() => setParam("size", props.size === sz ? null : sz)}
              />
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
