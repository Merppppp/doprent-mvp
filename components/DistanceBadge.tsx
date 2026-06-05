"use client";

import { AREAS } from "@/lib/areas";
import { formatKm, haversineKm } from "@/lib/geo";
import { useUserLocation } from "./LocationProvider";

/**
 * Shows "~X กม" from the visitor's chosen location to a shop's area centroid.
 * Renders nothing until the visitor sets a location, or if the area is unknown.
 */
export default function DistanceBadge({
  areaKey,
  style,
}: {
  areaKey?: string | null;
  style?: React.CSSProperties;
}) {
  const { loc } = useUserLocation();
  if (!loc || !areaKey) return null;
  const a = AREAS[areaKey];
  if (!a) return null;
  const km = haversineKm(loc.lat, loc.lng, a.lat, a.lng);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        fontWeight: 600,
        color: "var(--accent-2)",
        ...style,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      ~{formatKm(km)}
    </span>
  );
}
