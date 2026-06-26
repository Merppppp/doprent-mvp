"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";
import { searchSuggest, type SearchSuggestResult } from "@/app/actions/search";

const EMPTY: SearchSuggestResult = { products: [], shops: [], brands: [] };

export default function NavbarSearch({ locale = "th" }: { locale?: Locale }) {
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [sug, setSug] = useState<SearchSuggestResult>(EMPTY);
  const [loading, setLoading] = useState(false);
  // -1 = the input itself / no row highlighted; otherwise an index into `flatItems`.
  const [active, setActive] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // Keep the box in sync with the URL ?q= so it survives a refresh and reflects
  // back/forward navigation. While typing, urlQ is unchanged so this won't fight
  // the user's input.
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  // Debounced suggestion fetch. Each keystroke schedules a fetch ~180ms later;
  // an incrementing reqId guards against out-of-order responses.
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSug(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myId = ++reqId.current;
    const handle = setTimeout(async () => {
      try {
        const res = await searchSuggest(trimmed);
        if (myId === reqId.current) {
          setSug(res);
          setActive(-1);
        }
      } finally {
        if (myId === reqId.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [q]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const goSearch = (term: string) => {
    const trimmed = term.trim();
    setOpen(false);
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  };

  const goTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  // Flatten product rows + shop rows + the "search for X" item into one
  // navigable list so ↑/↓ can move across all of them uniformly.
  type FlatItem = { kind: "product" | "brand" | "shop" | "all"; href: string };
  const flatItems: FlatItem[] = [
    ...sug.products.map((p) => ({ kind: "product" as const, href: `/product/${p.slug}` })),
    ...sug.brands.map((b) => ({ kind: "brand" as const, href: `/?q=${encodeURIComponent(b)}` })),
    ...sug.shops.map((s) => ({ kind: "shop" as const, href: `/shop/${s.slug}` })),
  ];
  const trimmed = q.trim();
  if (trimmed.length >= 2) flatItems.push({ kind: "all", href: `/?q=${encodeURIComponent(trimmed)}` });

  // Index offsets into flatItems for each group (keeps ↑/↓ highlight in sync).
  const brandBase = sug.products.length;
  const shopBase = sug.products.length + sug.brands.length;

  const hasResults = sug.products.length > 0 || sug.brands.length > 0 || sug.shops.length > 0;
  const showDropdown = open && trimmed.length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && active < flatItems.length) {
      goTo(flatItems[active].href);
    } else {
      goSearch(q);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || flatItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? flatItems.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%" }}>
      <form
        onSubmit={handleSubmit}
        role="search"
        style={{
          display: "flex",
          alignItems: "center",
          height: 36,
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 999,
          overflow: "hidden",
          width: "100%",
          transition: "background .2s, border-color .2s",
        }}
        className="ns-form"
      >
        <label htmlFor="ns-input" className="sr-only">{t("search.label", locale)}</label>
        <span style={{ paddingLeft: 14, color: "rgba(255,255,255,0.65)", display: "grid", placeItems: "center", flexShrink: 0 }} aria-hidden>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          id="ns-input"
          type="search"
          placeholder={t("search.placeholder", locale)}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="ns-suggest"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "0 10px",
            fontSize: 13.5,
            color: "var(--on-dark)",
            fontFamily: "inherit",
            minWidth: 0,
          }}
          className="ns-input"
        />
        <button
          type="submit"
          aria-label={t("search.button", locale)}
          style={{
            flexShrink: 0,
            margin: 3,
            width: 30,
            height: 30,
            borderRadius: 999,
            background: "var(--on-dark)",
            color: "var(--accent)",
            border: "none",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </form>

      {showDropdown && (
        <div
          id="ns-suggest"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            border: "1px solid var(--line)",
            overflow: "hidden",
            zIndex: 60,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {!hasResults && loading && (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--ink-3)" }}>{t("search.loading", locale)}</div>
          )}
          {!hasResults && !loading && (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--ink-3)" }}>{t("search.empty", locale)}</div>
          )}

          {sug.products.length > 0 && (
            <div role="group" aria-label={t("search.products", locale)}>
              <div style={ns_groupLabel}>{t("search.products", locale)}</div>
              {sug.products.map((p, i) => {
                const idx = i;
                return (
                  <button
                    key={`p-${p.slug}`}
                    type="button"
                    role="option"
                    aria-selected={active === idx}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => goTo(`/product/${p.slug}`)}
                    style={{ ...ns_row, background: active === idx ? "var(--accent-soft)" : "transparent" }}
                  >
                    <span style={ns_thumb}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image ? <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                    </span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                      <span style={ns_name}>{p.name}</span>
                      <span style={ns_sub}>{p.shopName}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {sug.brands.length > 0 && (
            <div role="group" aria-label={t("search.brands", locale)}>
              <div style={ns_groupLabel}>{t("search.brands", locale)}</div>
              {sug.brands.map((b, i) => {
                const idx = brandBase + i;
                return (
                  <button
                    key={`b-${b}`}
                    type="button"
                    role="option"
                    aria-selected={active === idx}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => goSearch(b)}
                    style={{ ...ns_row, background: active === idx ? "var(--accent-soft)" : "transparent" }}
                  >
                    <span style={{ ...ns_thumb, display: "grid", placeItems: "center", color: "var(--accent)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M6 3h12l3 7-9 11L3 10z" /><path d="M3 10h18" />
                      </svg>
                    </span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                      <span style={ns_name}>{b}</span>
                      <span style={ns_sub}>{t("search.brand", locale)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {sug.shops.length > 0 && (
            <div role="group" aria-label={t("search.shops", locale)}>
              <div style={ns_groupLabel}>{t("search.shops", locale)}</div>
              {sug.shops.map((s, i) => {
                const idx = shopBase + i;
                return (
                  <button
                    key={`s-${s.slug}`}
                    type="button"
                    role="option"
                    aria-selected={active === idx}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => goTo(`/shop/${s.slug}`)}
                    style={{ ...ns_row, background: active === idx ? "var(--accent-soft)" : "transparent" }}
                  >
                    <span style={{ ...ns_thumb, display: "grid", placeItems: "center", color: "var(--accent)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M3 9l1-5h16l1 5M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M3 9h18" />
                      </svg>
                    </span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                      <span style={ns_name}>{s.name}</span>
                      <span style={ns_sub}>{t("search.shop", locale)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {trimmed.length >= 2 && (
            <button
              type="button"
              role="option"
              aria-selected={active === flatItems.length - 1}
              onMouseEnter={() => setActive(flatItems.length - 1)}
              onClick={() => goSearch(trimmed)}
              style={{
                ...ns_row,
                borderTop: hasResults ? "1px solid var(--line)" : "none",
                background: active === flatItems.length - 1 ? "var(--accent-soft)" : "transparent",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              <span style={{ ...ns_thumb, display: "grid", placeItems: "center", color: "var(--accent)", background: "var(--accent-soft)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </span>
              <span style={{ fontSize: 13.5 }}>{t("search.searchFor", locale)} “{trimmed}”</span>
            </button>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .ns-form:focus-within { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.4); }
        .ns-input::placeholder { color: rgba(255,255,255,0.5); }
        .ns-input::-webkit-search-cancel-button { -webkit-appearance: none; }
        .sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0 }
      `}} />
    </div>
  );
}

// --- inline style atoms (kept local; matches the navbar's existing inline-style approach) ---
const ns_groupLabel: React.CSSProperties = {
  padding: "8px 14px 4px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  color: "var(--ink-3)",
  textTransform: "uppercase",
};
const ns_row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 14px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
};
const ns_thumb: React.CSSProperties = {
  width: 38,
  height: 38,
  flexShrink: 0,
  borderRadius: 8,
  overflow: "hidden",
  background: "var(--line-2)",
};
const ns_name: React.CSSProperties = {
  display: "block",
  fontSize: 13.5,
  color: "var(--ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const ns_sub: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  color: "var(--ink-3)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
