/**
 * Static Bangkok district centroids, keyed by district English name.
 *
 * IMPORTANT: keys here must match `boutiques.area_key`, which the seller signup
 * derives from the chosen district (`district.en` in lib/bangkok-districts.ts —
 * see SignupForm). So we key by district `en` (e.g. "Bang Rak", "Watthana"),
 * NOT by sub-area names.
 *
 * Centroids are approximate (good enough for "~X กม" straight-line display) and
 * privacy-safe: we measure to the district centroid, never the seller's hidden
 * exact lat/lng.
 */
export type AreaPoint = { th: string; lat: number; lng: number };

export const AREAS: Record<string, AreaPoint> = {
  "Phra Nakhon": { th: "พระนคร", lat: 13.7625, lng: 100.4978 },
  Dusit: { th: "ดุสิต", lat: 13.777, lng: 100.515 },
  "Nong Chok": { th: "หนองจอก", lat: 13.8556, lng: 100.8625 },
  "Bang Rak": { th: "บางรัก", lat: 13.727, lng: 100.524 },
  "Bang Khen": { th: "บางเขน", lat: 13.874, lng: 100.596 },
  "Bang Kapi": { th: "บางกะปิ", lat: 13.765, lng: 100.647 },
  "Pathum Wan": { th: "ปทุมวัน", lat: 13.744, lng: 100.532 },
  "Pom Prap Sattru Phai": { th: "ป้อมปราบศัตรูพ่าย", lat: 13.758, lng: 100.513 },
  "Phra Khanong": { th: "พระโขนง", lat: 13.702, lng: 100.601 },
  "Min Buri": { th: "มีนบุรี", lat: 13.814, lng: 100.748 },
  "Lat Krabang": { th: "ลาดกระบัง", lat: 13.722, lng: 100.76 },
  "Yan Nawa": { th: "ยานนาวา", lat: 13.697, lng: 100.543 },
  Samphanthawong: { th: "สัมพันธวงศ์", lat: 13.732, lng: 100.513 },
  "Phaya Thai": { th: "พญาไท", lat: 13.78, lng: 100.543 },
  "Thon Buri": { th: "ธนบุรี", lat: 13.725, lng: 100.486 },
  "Bangkok Yai": { th: "บางกอกใหญ่", lat: 13.723, lng: 100.476 },
  "Huai Khwang": { th: "ห้วยขวาง", lat: 13.777, lng: 100.579 },
  "Khlong San": { th: "คลองสาน", lat: 13.73, lng: 100.51 },
  "Taling Chan": { th: "ตลิ่งชัน", lat: 13.777, lng: 100.456 },
  "Bangkok Noi": { th: "บางกอกน้อย", lat: 13.766, lng: 100.469 },
  "Bang Khun Thian": { th: "บางขุนเทียน", lat: 13.661, lng: 100.436 },
  "Phasi Charoen": { th: "ภาษีเจริญ", lat: 13.715, lng: 100.437 },
  "Nong Khaem": { th: "หนองแขม", lat: 13.708, lng: 100.349 },
  "Rat Burana": { th: "ราษฎร์บูรณะ", lat: 13.682, lng: 100.505 },
  "Bang Phlat": { th: "บางพลัด", lat: 13.794, lng: 100.505 },
  "Din Daeng": { th: "ดินแดง", lat: 13.77, lng: 100.553 },
  "Bueng Kum": { th: "บึงกุ่ม", lat: 13.785, lng: 100.669 },
  Sathon: { th: "สาทร", lat: 13.718, lng: 100.529 },
  "Bang Sue": { th: "บางซื่อ", lat: 13.809, lng: 100.537 },
  Chatuchak: { th: "จตุจักร", lat: 13.828, lng: 100.559 },
  "Bang Kho Laem": { th: "บางคอแหลม", lat: 13.693, lng: 100.502 },
  Prawet: { th: "ประเวศ", lat: 13.717, lng: 100.694 },
  "Khlong Toei": { th: "คลองเตย", lat: 13.708, lng: 100.584 },
  "Suan Luang": { th: "สวนหลวง", lat: 13.732, lng: 100.652 },
  "Chom Thong": { th: "จอมทอง", lat: 13.677, lng: 100.484 },
  "Don Mueang": { th: "ดอนเมือง", lat: 13.912, lng: 100.596 },
  Ratchathewi: { th: "ราชเทวี", lat: 13.758, lng: 100.534 },
  "Lat Phrao": { th: "ลาดพร้าว", lat: 13.806, lng: 100.607 },
  Watthana: { th: "วัฒนา", lat: 13.74, lng: 100.585 },
  "Bang Khae": { th: "บางแค", lat: 13.696, lng: 100.409 },
  "Lak Si": { th: "หลักสี่", lat: 13.887, lng: 100.579 },
  "Sai Mai": { th: "สายไหม", lat: 13.921, lng: 100.646 },
  "Khan Na Yao": { th: "คันนายาว", lat: 13.826, lng: 100.681 },
  "Saphan Sung": { th: "สะพานสูง", lat: 13.766, lng: 100.686 },
  "Wang Thonglang": { th: "วังทองหลาง", lat: 13.779, lng: 100.609 },
  "Khlong Sam Wa": { th: "คลองสามวา", lat: 13.859, lng: 100.704 },
  "Bang Na": { th: "บางนา", lat: 13.68, lng: 100.588 },
  "Thawi Watthana": { th: "ทวีวัฒนา", lat: 13.789, lng: 100.376 },
  "Thung Khru": { th: "ทุ่งครุ", lat: 13.648, lng: 100.494 },
  "Bang Bon": { th: "บางบอน", lat: 13.659, lng: 100.399 },
};

/** Districts as a sorted list for the "เลือกย่าน" dropdown. */
export const AREA_LIST: { key: string; th: string }[] = Object.entries(AREAS)
  .map(([key, v]) => ({ key, th: v.th }))
  .sort((a, b) => a.th.localeCompare(b.th, "th"));
