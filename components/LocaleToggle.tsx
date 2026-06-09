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

export default function LocaleToggle({ defaultLocale = "th" }: { defaultLocale?: string }) {
  const [locale, setLocale] = useState(defaultLocale);

  useEffect(() => {
    setLocale(getLocale());
  }, []);

  const toggle = () => {
    const next = locale === "th" ? "en" : "th";
    setLocale(next);
    setLocaleCookie(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.1)",
        cursor: "pointer",
        fontFamily: "inherit",
        color: "rgba(255,255,255,0.9)",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: locale === "th" ? 700 : 400,
          color: locale === "th" ? "#fff" : "rgba(255,255,255,0.4)",
          transition: "color .15s, font-weight .15s",
          letterSpacing: "0.03em",
        }}
      >
        TH
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "0 3px" }}>/</span>
      <span
        style={{
          fontSize: 12,
          fontWeight: locale === "en" ? 700 : 400,
          color: locale === "en" ? "#fff" : "rgba(255,255,255,0.4)",
          transition: "color .15s, font-weight .15s",
          letterSpacing: "0.03em",
        }}
      >
        EN
      </span>
    </button>
  );
}
