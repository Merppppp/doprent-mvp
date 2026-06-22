"use client";

import { useEffect, useState } from "react";

function getLocale(): string {
  if (typeof document === "undefined") return "th";
  const m = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "th";
}

function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function LocaleToggle({
  defaultLocale = "th",
  variant = "navbar",
}: {
  defaultLocale?: string;
  variant?: "navbar" | "navbar-top" | "dropdown" | "footer" | "footer-inline";
}) {
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    setLocale(getLocale());
  }, []);

  const toggle = () => {
    const next = locale === "th" ? "en" : "th";
    setLocale(next);
    setLocaleCookie(next);
    window.location.reload();
  };

  const isInline = variant === "footer-inline";
  const isDark = variant === "dropdown" || variant === "footer" || isInline;
  const isTopBar = variant === "navbar-top";
  const activeColor = isDark ? "var(--ink)" : "#fff";
  const mutedColor = isDark ? "var(--ink-3)" : "rgba(255,255,255,0.4)";
  const dividerColor = isDark ? "var(--ink-3)" : "rgba(255,255,255,0.3)";

  return (
    <button
      type="button"
      onClick={toggle}
      title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: isTopBar || isInline ? 0 : isDark ? "6px 0" : "0 12px",
        height: isTopBar || isInline ? "auto" : isDark ? "auto" : 36,
        borderRadius: isTopBar || isInline ? 0 : isDark ? 0 : 999,
        border: isTopBar || isDark ? "none" : "1px solid rgba(255,255,255,0.25)",
        background: "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1,
        flexShrink: 0,
        width: isDark && !isInline ? "100%" : undefined,
        verticalAlign: isInline ? "middle" : undefined,
      }}
    >
      {isDark && !isInline && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginRight: 8, flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: locale === "th" ? 700 : 400,
          color: locale === "th" ? activeColor : mutedColor,
          transition: "color .15s",
          letterSpacing: "0.03em",
        }}
      >
        TH
      </span>
      <span style={{ fontSize: 11, color: dividerColor, margin: "0 3px" }}>/</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: locale === "en" ? 700 : 400,
          color: locale === "en" ? activeColor : mutedColor,
          transition: "color .15s",
          letterSpacing: "0.03em",
        }}
      >
        EN
      </span>
    </button>
  );
}
