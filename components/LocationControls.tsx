"use client";

import { AREA_LIST } from "@/lib/areas";
import { t, type Locale } from "@/lib/i18n";
import { useUserLocation } from "./LocationProvider";

const RADII = [3, 5, 10] as const;

function Pin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "5px 11px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
    background: active ? "var(--accent-soft)" : "var(--bg)",
    color: active ? "var(--accent-2)" : "var(--ink-2)",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 14px",
  borderRadius: 999,
  border: "0",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export default function LocationControls({ locale = "th" }: { locale?: Locale }) {
  const { loc, label, source, status, requestGps, setArea, clear, radius, setRadius } = useUserLocation();

  if (loc) {
    return (
      <div
        className="loc-controls"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          minWidth: 0,
          flex: "1 1 auto",
        }}
      >
        {/* Location label */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}>
          <Pin />
          {t("results.nearLocation", locale).replace("{label}", label ?? "")}
          {source === "gps" ? (
            <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>(GPS)</span>
          ) : null}
        </span>

        {/* Radius chips */}
        <div style={{ display: "inline-flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
            {t("results.within", locale)}
          </span>
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(radius === r ? null : r)}
              style={chip(radius === r)}
            >
              {r} {t("results.km", locale)}
            </button>
          ))}
          <button type="button" onClick={() => setRadius(null)} style={chip(radius === null)}>
            {t("results.all", locale)}
          </button>
        </div>

        {/* Change location */}
        <button type="button" onClick={clear} style={chip(false)}>
          {t("results.changeLocation", locale)}
        </button>
      </div>
    );
  }

  // No location set
  return (
    <div
      className="loc-controls"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        minWidth: 0,
        flex: "1 1 auto",
      }}
    >
      <button
        type="button"
        onClick={requestGps}
        disabled={status === "loading"}
        style={primaryBtn}
      >
        <Pin />
        {status === "loading" ? t("results.findingLocation", locale) : t("results.nearMe", locale)}
      </button>
      <div
        className="loc-district-group"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}
      >
        <span
          className="loc-district-label"
          style={{ fontSize: 13, color: "var(--ink-3)", whiteSpace: "nowrap" }}
        >
          {t("results.orSelectDistrict", locale)}
        </span>
        <select
          defaultValue=""
          onChange={(e) => e.target.value && setArea(e.target.value)}
          aria-label={t("results.selectDistrict", locale)}
          className="loc-district-select"
          style={{
            padding: "5px 8px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--bg)",
            fontSize: 13,
            color: "var(--ink)",
            fontFamily: "inherit",
            maxWidth: 160,
            minWidth: 0,
            height: 34,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
        <option value="" disabled>
          {t("results.selectDistrict", locale)}
        </option>
        {AREA_LIST.map((a) => (
            <option key={a.key} value={a.key}>
              {a.th}
            </option>
          ))}
        </select>
      </div>
      {status === "denied" ? (
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {t("results.locationDenied", locale)}
        </span>
      ) : null}
    </div>
  );
}
