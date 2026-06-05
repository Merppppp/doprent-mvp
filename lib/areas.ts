/**
 * Static Bangkok area centroids (key -> Thai label + lat/lng).
 *
 * Mirrors the `areas` table seed (supabase/migrations/2026-05-13_seed_areas.sql).
 * Bundled client-side so distance math needs no DB round-trip and no exact
 * shop address (privacy-safe: we measure to the area centroid, never the
 * seller's hidden lat/lng).
 *
 * If you add a new area to the seed, add it here too.
 */
export type AreaPoint = { th: string; lat: number; lng: number };

export const AREAS: Record<string, AreaPoint> = {
  Siam: { th: "สยาม", lat: 13.7456, lng: 100.534 },
  Chitlom: { th: "ชิดลม", lat: 13.7441, lng: 100.5424 },
  Ploenchit: { th: "เพลินจิต", lat: 13.7437, lng: 100.5476 },
  Wireless: { th: "วิทยุ", lat: 13.7406, lng: 100.5436 },
  Asok: { th: "อโศก", lat: 13.7376, lng: 100.5612 },
  "Sukhumvit 11": { th: "สุขุมวิท 11", lat: 13.743, lng: 100.555 },
  "Phrom Phong": { th: "พร้อมพงษ์", lat: 13.7307, lng: 100.5697 },
  Thonglor: { th: "ทองหล่อ", lat: 13.7268, lng: 100.578 },
  Ekkamai: { th: "เอกมัย", lat: 13.7237, lng: 100.5849 },
  "Phra Khanong": { th: "พระโขนง", lat: 13.7138, lng: 100.5897 },
  Onnut: { th: "อ่อนนุช", lat: 13.705, lng: 100.6018 },
  Watthana: { th: "วัฒนา", lat: 13.735, lng: 100.58 },
  Ari: { th: "อารีย์", lat: 13.7795, lng: 100.5443 },
  Sathorn: { th: "สาทร", lat: 13.722, lng: 100.529 },
  Silom: { th: "สีลม", lat: 13.7244, lng: 100.53 },
  "Sala Daeng": { th: "ศาลาแดง", lat: 13.7244, lng: 100.5345 },
  Surawong: { th: "สุรวงศ์", lat: 13.728, lng: 100.526 },
  Bangrak: { th: "บางรัก", lat: 13.7298, lng: 100.5232 },
  Charoenkrung: { th: "เจริญกรุง", lat: 13.7268, lng: 100.5135 },
  Yaowarat: { th: "เยาวราช", lat: 13.7411, lng: 100.5089 },
  Pratunam: { th: "ประตูน้ำ", lat: 13.7521, lng: 100.5403 },
  Lumpini: { th: "ลุมพินี", lat: 13.7298, lng: 100.5444 },
  "Phaya Thai": { th: "พญาไท", lat: 13.757, lng: 100.534 },
  Ratchadaphisek: { th: "รัชดาภิเษก", lat: 13.77, lng: 100.575 },
  "Bang Na": { th: "บางนา", lat: 13.668, lng: 100.605 },
};

/** Areas as a sorted list for dropdowns. */
export const AREA_LIST: { key: string; th: string }[] = Object.entries(AREAS)
  .map(([key, v]) => ({ key, th: v.th }))
  .sort((a, b) => a.th.localeCompare(b.th, "th"));
