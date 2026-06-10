"use client";

import { useCallback, useState } from "react";
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

function SubGroupHeader({
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
      className={`flex items-center justify-between w-full p-0 border-none bg-transparent cursor-pointer font-[inherit] ${open ? "mb-1.5" : "mb-0"}`}
    >
      <span className="text-[11px] font-semibold text-[var(--ink-3)] uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-[10px] text-[var(--ink-3)] inline-block transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
      >
        ▼
      </span>
    </button>
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

  const [typeGroups, setTypeGroups] = useState({
    top: true,
    bottom: true,
    dress: true,
  });

  const toggleSection = (key: keyof typeof sections) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleTypeGroup = (key: keyof typeof typeGroups) =>
    setTypeGroups((prev) => ({ ...prev, [key]: !prev[key] }));

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

      {/* ════ Section: Occasion ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={t("filter.occasion", locale)}
          open={sections.occasion}
          onToggle={() => toggleSection("occasion")}
        />
        {sections.occasion && (
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {props.occasions.map((occ) => (
              <Chip
                key={occ.value}
                label={occ.label}
                active={props.occasion === occ.value}
                onClick={() => setParam("occasion", props.occasion === occ.value ? null : occ.value)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ════ Section: Dress Type ════ */}
      <div className="py-3 border-b border-[var(--line)]/50">
        <SectionHeader
          label={t("filter.type", locale)}
          open={sections.type}
          onToggle={() => toggleSection("type")}
        />
        {sections.type && (
          <div className="flex flex-col gap-2 mt-2">
            {DRESS_TYPE_GROUPS.map((group) => {
              const groupLabel = t(`type.group.${group.key}`, locale);
              return (
                <div key={group.key}>
                  <SubGroupHeader
                    label={groupLabel}
                    open={typeGroups[group.key]}
                    onToggle={() => toggleTypeGroup(group.key)}
                  />
                  {typeGroups[group.key] && (
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                      {group.items.map((item) => {
                        const itemLabel =
                          locale === "en" ? (DRESS_ITEM_EN[item] ?? item) : item;
                        return (
                          <Chip
                            key={item}
                            label={itemLabel}
                            active={activeType === item}
                            onClick={() => setParam("type", activeType === item ? null : item)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
