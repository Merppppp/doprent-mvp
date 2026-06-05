"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; swatch?: string };

/**
 * Themed single-select combobox with a search box. Native <select> can't
 * filter/search, so this is a custom popover. Click outside or Esc to close.
 */
export default function SearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "ทั้งหมด",
  allLabel = "ทั้งหมด",
  searchable = true,
}: {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  allLabel?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 600, color: "var(--ink-3)" }}>{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          border: `1px solid ${open ? "var(--accent)" : "var(--line)"}`,
          borderRadius: 8,
          background: "var(--surface)",
          fontSize: 14,
          color: selected ? "var(--ink)" : "var(--ink-3)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {selected?.swatch ? (
          <span style={{ width: 12, height: 12, borderRadius: 999, background: selected.swatch, border: "1px solid var(--line)", flexShrink: 0 }} />
        ) : null}
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selected ? selected.label : placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} aria-hidden>
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 12px 30px -12px oklch(0.3 0.05 80/.4)",
            overflow: "hidden",
          }}
        >
          {searchable ? (
            <div style={{ padding: 8, borderBottom: "1px solid var(--line)" }}>
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`ค้นหา${label}…`}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg)", fontSize: 13, color: "var(--ink)" }}
              />
            </div>
          ) : null}
          <div style={{ maxHeight: 240, overflowY: "auto", padding: 4 }}>
            <Option active={value == null} onClick={() => { onChange(null); setOpen(false); setQuery(""); }}>
              {allLabel}
            </Option>
            {filtered.map((o) => (
              <Option
                key={o.value}
                active={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              >
                {o.swatch ? <span style={{ width: 12, height: 12, borderRadius: 999, background: o.swatch, border: "1px solid var(--line)", marginRight: 8, display: "inline-block", verticalAlign: "middle" }} /> : null}
                {o.label}
              </Option>
            ))}
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--ink-3)" }}>ไม่พบ</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Option({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: 6,
        border: 0,
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-2)" : "var(--ink)",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
