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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: 0,
        border: "none",
        background: "none",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          color: "var(--ink-3)",
          transition: "transform .2s",
          display: "inline-block",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        }}
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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: 0,
        border: "none",
        background: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        marginBottom: open ? 6 : 0,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--ink-3)",
          display: "inline-block",
          transition: "transform .2s",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        }}
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
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? "#fff" : "var(--ink-2)",
        background: active ? "#1B4332" : "var(--surface)",
        border: `1px solid ${active ? "#1B4332" : "var(--line)"}`,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all .15s",
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 8px",
        borderRadius: 8,
        border: `1.5px solid ${active ? "#1B4332" : "var(--line)"}`,
        background: active ? "var(--accent-soft)" : "var(--surface)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all .15s",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: hex,
          border: hex === "#FFFFFF" || hex === "#FFFDD0" ? "1px solid var(--line)" : "none",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 12, color: active ? "#1B4332" : "var(--ink-2)", fontWeight: active ? 600 : 400 }}>
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
    type: true,
    color: true,
    size: true,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Header row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
          {t("filter.title", locale)}
        </span>
        {hasAny ? (
          <button
            type="button"
            onClick={() => router.push(pathname, { scroll: false })}
            style={{
              fontSize: 12,
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          >
            {t("filter.clearAll", locale)}
          </button>
        ) : null}
      </div>

      {/* ════ Section: Occasion ════ */}
      <div style={sectionStyle}>
        <SectionHeader
          label={t("filter.occasion", locale)}
          open={sections.occasion}
          onToggle={() => toggleSection("occasion")}
        />
        {sections.occasion && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
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
      <div style={sectionStyle}>
        <SectionHeader
          label={t("filter.type", locale)}
          open={sections.type}
          onToggle={() => toggleSection("type")}
        />
        {sections.type && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
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
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 6 }}>
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
      <div style={sectionStyle}>
        <SectionHeader
          label={t("filter.color", locale)}
          open={sections.color}
          onToggle={() => toggleSection("color")}
        />
        {sections.color && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
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
      <div style={sectionStyle}>
        <SectionHeader
          label={t("filter.size", locale)}
          open={sections.size}
          onToggle={() => toggleSection("size")}
        />
        {sections.size && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
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
      <div style={{ ...sectionStyle, borderBottom: "none" }}>
        <SectionHeader
          label={t("filter.price", locale)}
          open={sections.price}
          onToggle={() => toggleSection("price")}
        />
        {sections.price && (
          <div style={{ marginTop: 12 }}>
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

const sectionStyle: React.CSSProperties = {
  paddingTop: 16,
  paddingBottom: 16,
  borderBottom: "1px solid var(--line)",
};
