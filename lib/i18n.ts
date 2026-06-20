// ── i18n — simple cookie-based 2-locale translation system ───────────────────
// Server locale reading lives in lib/i18n-server.ts (imports next/headers).
// This file is safe to import in both server and client components.

export type Locale = "th" | "en";

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const TRANSLATIONS: Record<string, Record<Locale, string>> = {
  // ── Nav ──────────────────────────────────────────────────────────────────
  "nav.openShop": { th: "เปิดร้านกับ DopRent", en: "Open Shop with DopRent" },
  "nav.followUs": { th: "ติดตามเราบน", en: "Follow us on" },
  "nav.login":    { th: "เข้าสู่ระบบ",          en: "Sign In" },
  "nav.signup":   { th: "สมัครสมาชิก",           en: "Sign Up" },
  "nav.savedAria":{ th: "ชุดที่ถูกใจ",           en: "Liked dresses" },

  // ── Search ────────────────────────────────────────────────────────────────
  "search.placeholder": { th: "ค้นหาชุด...",             en: "Search dresses..." },
  "search.label":       { th: "ค้นหาชุดเช่า",            en: "Search dress rentals" },
  "search.button":      { th: "ค้นหา",                  en: "Search" },
  "search.loading":     { th: "กำลังค้นหา...",          en: "Searching..." },
  "search.empty":       { th: "ไม่พบผลลัพธ์",            en: "No results" },
  "search.products":    { th: "สินค้า",                 en: "Products" },
  "search.shops":       { th: "ร้านค้า",                en: "Shops" },
  "search.shop":        { th: "ร้านค้า",                en: "Shop" },
  "search.brands":      { th: "แบรนด์",                 en: "Brands" },
  "search.brand":       { th: "แบรนด์",                 en: "Brand" },
  "search.searchFor":   { th: "ค้นหา",                  en: "Search for" },

  // ── Sort ─────────────────────────────────────────────────────────────────
  "sort.label":       { th: "เรียงลำดับ",      en: "Sort" },
  "sort.featured":    { th: "เกี่ยวข้อง",      en: "Relevant" },
  "sort.priceAsc":    { th: "ราคา ต่ำ→สูง",   en: "Price: Low → High" },
  "sort.priceDesc":   { th: "ราคา สูง→ต่ำ",   en: "Price: High → Low" },
  "sort.ratingDesc":  { th: "คะแนนรีวิว",      en: "Top Rated" },

  // ── Filter ───────────────────────────────────────────────────────────────
  "filter.title":    { th: "Filter",         en: "Filter" },
  "filter.clearAll": { th: "ล้างทั้งหมด",    en: "Clear All" },
  "filter.occasion": { th: "โอกาส",          en: "Occasion" },
  "filter.type":     { th: "ประเภทชุด",      en: "Dress Type" },
  "filter.color":    { th: "สี",             en: "Color" },
  "filter.size":     { th: "Size",           en: "Size" },
  "filter.price":    { th: "ราคา / วัน",     en: "Price / Day" },
  "filter.selected":       { th: "ตัวกรองที่เลือก",     en: "Selected Filters" },
  "filter.searchOccasion": { th: "ค้นหาโอกาส...",       en: "Search occasions..." },
  "filter.searchType":     { th: "ค้นหาประเภทชุด...",   en: "Search dress types..." },
  "filter.showAll":        { th: "แสดงทั้งหมด ({n})",   en: "Show all ({n})" },
  "filter.showLess":       { th: "แสดงน้อยลง",          en: "Show less" },
  "filter.noResults":      { th: "ไม่พบรายการ",         en: "No matches" },
  "filter.removeFilter":        { th: "ลบตัวกรอง",               en: "Remove filter" },
  "filter.searchTags":          { th: "ค้นหาแท็ก...",             en: "Search tags..." },
  "filter.bodyMeasurements":    { th: "ขนาดตัว",                  en: "Body Measurements" },
  "filter.bust":                { th: "รอบอก",                    en: "Bust" },
  "filter.waist":               { th: "รอบเอว",                   en: "Waist" },
  "filter.length":              { th: "ความยาว",                  en: "Length" },
  "unit.cm":                    { th: "ซม.",                       en: "cm" },
  "filter.openOnly":            { th: "เฉพาะร้านเปิดอยู่",          en: "Open shops only" },

  // Dress-type sub-group headers
  "type.group.top":    { th: "เสื้อ",                  en: "Tops" },
  "type.group.bottom": { th: "กางเกง / กระโปรง",      en: "Bottoms" },
  "type.group.dress":  { th: "เดรส",                   en: "Dresses" },

  // ── Occasions ────────────────────────────────────────────────────────────
  "occasion.engagement": { th: "งานหมั้น", en: "Engagement" },
  "occasion.wedding":    { th: "งานแต่ง",  en: "Wedding" },
  "occasion.cocktail":   { th: "ค็อกเทล",  en: "Cocktail" },
  "occasion.evening":    { th: "ราตรี",    en: "Evening" },
  "occasion.gala":       { th: "กาล่า",   en: "Gala" },
  "occasion.party":      { th: "ปาร์ตี้",  en: "Party" },
  "occasion.work":       { th: "ทำงาน",   en: "Work" },
  "occasion.casual":     { th: "ลำลอง",   en: "Casual" },

  // ── Colors ───────────────────────────────────────────────────────────────
  "color.rose":   { th: "กุหลาบ", en: "Rose" },
  "color.ivory":  { th: "งาช้าง", en: "Ivory" },
  "color.green":  { th: "เขียว",  en: "Green" },
  "color.black":  { th: "ดำ",     en: "Black" },
  "color.navy":   { th: "กรมท่า", en: "Navy" },
  "color.red":    { th: "แดง",    en: "Red" },
  "color.blue":   { th: "ฟ้า",    en: "Blue" },
  "color.purple": { th: "ม่วง",   en: "Purple" },

  // ── Results / infinite scroll ────────────────────────────────────────────
  "results.loading":         { th: "กำลังโหลด...",                                               en: "Loading..." },
  "results.allShown":        { th: "แสดงครบทั้ง {n} ชุดแล้ว",                                    en: "All {n} items shown" },
  "results.noMore":          { th: "หมดแล้ว",                                                    en: "No more" },
  "results.nearLocation":    { th: "ใกล้ {label}",                                               en: "Near {label}" },
  "results.within":          { th: "ในระยะ",                                                    en: "Within" },
  "results.km":              { th: "กม",                                                         en: "km" },
  "results.all":             { th: "ทั้งหมด",                                                    en: "All" },
  "results.changeLocation":  { th: "เปลี่ยนตำแหน่ง",                                             en: "Change Location" },
  "results.nearMe":          { th: "ใกล้ฉัน",                                                    en: "Near Me" },
  "results.findingLocation": { th: "กำลังหาตำแหน่ง…",                                            en: "Finding location…" },
  "results.orSelectDistrict":{ th: "หรือเลือกเขต",                                               en: "or select district" },
  "results.selectDistrict":  { th: "เลือกเขต…",                                                  en: "Select district…" },
  "results.locationDenied":  { th: "เปิดสิทธิ์ตำแหน่งไม่ได้ เลือกเขตแทนได้",                       en: "Location access denied. Select a district instead." },
  "results.noneInRadius":    { th: "ไม่มีชุดในระยะที่เลือก ลองขยายระยะหรือเลือก “ทั้งหมด”", en: "No dresses in radius. Try expanding or select “All”." },

  // ── Results count (page.tsx) ─────────────────────────────────────────────
  "results.found": { th: "พบ",  en: "Found" },
  "results.items": { th: "ชุด", en: "items" },

  // ── Empty state (page.tsx) ───────────────────────────────────────────────
  "empty.title":       { th: "ไม่พบชุดที่ตรงกับตัวกรอง",                              en: "No items match your filters" },
  "empty.description": { th: "ลองล้างตัวกรองหรือทักหาเรา เราจะหาให้",                 en: "Try clearing your filters or message us — we’ll find it for you." },
  "empty.clearAll":    { th: "ล้างตัวกรองทั้งหมด",                                   en: "Clear All Filters" },

  // ── User menu ────────────────────────────────────────────────────────────
  "menu.myBookings":   { th: "การจองของฉัน",        en: "My Bookings" },
  "menu.savedItems":   { th: "สินค้าที่ชอบ",         en: "Saved Items" },
  "menu.likedShops":   { th: "ร้านค้าที่ถูกใจ",     en: "Liked Shops" },
  "menu.myAccount":    { th: "บัญชีของฉัน",          en: "My Account" },
  "menu.manageShop":   { th: "จัดการร้านค้า",        en: "Manage Shop" },
  "menu.shopDashboard":{ th: "Dashboard ร้านของฉัน", en: "My Shop Dashboard" },
  "menu.shopBookings": { th: "การจองของร้าน",        en: "Shop Bookings" },
  "menu.signOut":      { th: "ออกจากระบบ",           en: "Sign Out" },

  // ── Mobile menu ───────────────────────────────────────────────────────────
  "mobile.browseDresses": { th: "เลือกชุด",          en: "Browse Dresses" },
  "mobile.boutiques":     { th: "ร้านเช่า",           en: "Boutiques" },
  "mobile.openMenu":      { th: "เปิดเมนู",           en: "Open menu" },
  "mobile.closeMenu":     { th: "ปิดเมนู",            en: "Close menu" },
  "mobile.menu":          { th: "เมนู",               en: "Menu" },
  "mobile.likedDresses":  { th: "ชุดที่ถูกใจ",        en: "Liked Dresses" },

  // ── Footer ────────────────────────────────────────────────────────────────
  "footer.tagline":     { th: "เช่าชุดจากร้านเช่าในไทย จองตรงผ่าน LINE",  en: "Rent dresses from boutiques in Thailand. Book directly via LINE." },
  "footer.shop":        { th: "เลือกซื้อ",            en: "Shop" },
  "footer.forShops":    { th: "สำหรับร้านค้า",        en: "For Shops" },
  "footer.contact":     { th: "ติดต่อ",               en: "Contact" },
  "footer.allDresses":  { th: "ทุกชุด",               en: "All Dresses" },
  "footer.engagement":  { th: "งานหมั้น",              en: "Engagement" },
  "footer.wedding":     { th: "งานแต่ง",              en: "Wedding" },
  "footer.cocktail":    { th: "ค็อกเทล",              en: "Cocktail" },
  "footer.workDress":   { th: "ชุดทำงาน",             en: "Work Dress" },
  "footer.openShop":    { th: "เปิดร้านบน DopRent",   en: "Open Shop on DopRent" },
  "footer.myDashboard": { th: "Dashboard ร้านของฉัน", en: "My Shop Dashboard" },
  "footer.allBoutiques":{ th: "ร้านเช่าทั้งหมด",      en: "All Boutiques" },
  "footer.sellLink":    { th: "เปิดร้านขาย →",        en: "Open a Shop →" },
  "footer.privacy":     { th: "นโยบายความเป็นส่วนตัว", en: "Privacy Policy" },
  "footer.terms":       { th: "เงื่อนไขการใช้บริการ",  en: "Terms of Service" },

  // ── Banner ────────────────────────────────────────────────────────────────
  "banner.kicker":   { th: "ร้านค้าแนะนำ",  en: "Featured Shop" },
  "banner.cta":      { th: "ดูร้านค้า",      en: "View Shop" },
  "banner.prevAria": { th: "ร้านก่อนหน้า",   en: "Previous shop" },
  "banner.nextAria": { th: "ร้านถัดไป",      en: "Next shop" },

  // ── Browse page ───────────────────────────────────────────────────────────
  "browse.byOccasion": { th: "เลือกตามโอกาส", en: "Browse by Occasion" },
  "browse.viewAll":    { th: "ดูทั้งหมด →",   en: "View All →" },
};

// ---------------------------------------------------------------------------
// Dress type items — Thai key → English label
// (Thai strings are also the URL param values, so we keep them as keys)
// ---------------------------------------------------------------------------

export const DRESS_ITEM_EN: Record<string, string> = {
  "แขนยาว":          "Long Sleeve",
  "แขนสั้น":         "Short Sleeve",
  "แขนกุด":          "Sleeveless",
  "สายเดี่ยว":       "Spaghetti Strap",
  "ปาดไหล่":         "Off Shoulder",
  "เกาะอก":          "Bustier",
  "เสื้อคลุม":       "Cover Up",
  "คอเต่า/เสื้อโค้ท": "Turtleneck / Coat",
  "แจ็คเก็ต":        "Jacket",
  "ชีทรู":           "Sheer",
  "กระโปรงยาว":      "Long Skirt",
  "กระโปรงสั้น":     "Short Skirt",
  "กางเกงขายาว":     "Long Pants",
  "กางเกงขาสั้น":    "Short Pants",
  "เดรสยาว":         "Long Dress",
  "เดรสสั้น":        "Short Dress",
};

// ---------------------------------------------------------------------------
// Core t() function
// ---------------------------------------------------------------------------

export function t(key: string, locale: Locale = "th"): string {
  return TRANSLATIONS[key]?.[locale] ?? TRANSLATIONS[key]?.["th"] ?? key;
}

// ---------------------------------------------------------------------------
// Client-side locale reader (safe to call anywhere in a browser environment)
// ---------------------------------------------------------------------------

export function getClientLocale(): Locale {
  if (typeof document === "undefined") return "th";
  const m = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
  const val = m ? decodeURIComponent(m[1]) : "th";
  return val === "en" ? "en" : "th";
}
