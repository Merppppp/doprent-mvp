/** Straight-line (great-circle) distance helpers. No API, no key, no cost. */

const R = 6371; // earth radius, km

/** Haversine distance in km between two lat/lng points. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Human-friendly Thai distance label: meters under 1km, else km. */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} ม`;
  if (km < 10) return `${km.toFixed(1)} กม`;
  return `${Math.round(km)} กม`;
}
