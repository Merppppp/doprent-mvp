"use client";

import { useState } from "react";
import LocationControls from "./LocationControls";
import { useUserLocation } from "./LocationProvider";
import { t, type Locale } from "@/lib/i18n";

function Pin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      aria-hidden
      style={{ transition: "transform .15s ease", transform: open ? "rotate(180deg)" : "none", flex: "0 0 auto" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * Location access for the results bar.
 * - Desktop (>767px): the wrapper is display:contents, so <LocationControls> sits
 *   inline in the bar exactly as before; the toggle button is hidden.
 * - Mobile (<=767px): only a compact pin toggle shows in the bar's first row;
 *   tapping it expands the full LocationControls panel full-width below.
 * CSS lives in app/page.tsx HR_CSS (.loc-toggle / .loc-panel).
 */
export default function ResultsBarLocation({ locale = "th" }: { locale?: Locale }) {
  const { loc, label } = useUserLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="loc-toggle"
        aria-expanded={open}
        aria-label={t("results.selectDistrict", locale)}
        onClick={() => setOpen((o) => !o)}
      >
        <Pin />
        <span className="loc-toggle__text">
          {loc ? (label ?? "") : t("results.nearMe", locale)}
        </span>
        <Chevron open={open} />
      </button>

      <div className={`loc-panel${open ? " is-open" : ""}`}>
        <LocationControls locale={locale} />
      </div>
    </>
  );
}
