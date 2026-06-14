
export type Color =
  | "rose"
  | "ivory"
  | "green"
  | "black"
  | "navy"
  | "red"
  | "blue"
  | "purple";

export type Size =
  | "XXXS"
  | "XXS"
  | "XS"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "XXL"
  | "3XL"
  | "4XL";

/** Canonical size order — single source for forms + filters. */
export const SIZES: Size[] = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

export type OccasionKey =
  | "engagement"
  | "wedding"
  | "cocktail"
  | "evening"
  | "gala"
  | "party"
  | "work"
  | "casual";

export type AdsTier = "free" | "boost" | "featured";
export type Status = "pending" | "live" | "rejected" | "draft";
export type KycStatus = "none" | "submitted" | "verified" | "rejected";

/** Booking lifecycle — mirrors the BookingStatus enum in prisma/schema.prisma.
 *  Keep in sync with BOOKING_STATUS_META / TRANSITIONS in lib/bookings.ts. */
export type BookingStatus =
  | "booking_pending"
  | "waiting_for_payment"
  | "payment_review"
  | "confirmed"
  | "cancel_requested"
  | "slip_disputed"
  | "rejected"
  | "cancelled"
  | "payment_expired"
  /** ผู้เช่าคืนชุดแล้ว รอร้านตรวจรับ — ระยะกลางของการปิดรายการ */
  | "returned"
  /** ร้านตรวจรับชุดเรียบร้อย ปิดรายการเช่าสมบูรณ์ — terminal สุดท้าย */
  | "completed";

/**
 * Public Occasion shape — mapper-output type (rev 3: assembled from the tag
 * system [group "occasion"] + i18n + UI color constant; no longer a DB table).
 */
export type Occasion = {
  key: OccasionKey;
  th: string;
  en: string;
  color_token: Color;
  sort_order: number;
};

/** Product type reference (e.g. "dress", "suit") — mirrors product_types. */
export type ProductType = {
  key: string;
  label: string;
  is_active: boolean;
};

/** Hierarchical product category (per product type) — mirrors product_categories. */
export type ProductCategory = {
  key: string;
  label: string;
  parent_key: string | null;
  product_type_key: string;
  sort_order: number;
  is_active: boolean;
};

/** Tag group (e.g. "occasion") — mirrors tag_groups. */
export type TagGroup = {
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

/** Tag inside a group (e.g. "wedding" in group "occasion") — mirrors tags. */
export type Tag = {
  key: string;
  label: string;
  group_key: string;
  is_active: boolean;
};

export type Area = {
  key: string;
  th: string;
  lat: number;
  lng: number;
  keywords: string[];
};

/** Lightweight product preview used in banner card stacks. */
export type ProductCard = {
  id: string;
  name: string;
  price_per_day: number;
  image: string | null;
};

export type Shop = {
  id: string;
  slug: string;
  name: string;
  owner_id: string | null;
  owner_name: string | null;
  area_key: string | null;
  area_label: string;
  address: string | null;
  /** Structured Thai address (added 2026-05-13 for proper geocoding). */
  house_no: string | null;
  street: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  line_url: string;
  instagram: string | null;
  /** PromptPay id (mobile/national-id) for in-web QR payments.
   *  Optional in the public Shop shape — only the booking flow selects it. */
  promptpay_id?: string | null;
  since_year: number | null;
  cover_color: Color;
  cover_image: string | null;
  tag: string | null;
  story: string | null;
  delivery_info: string | null;
  featured: boolean;
  /** Admin-toggled trust mark (post-KYC). Defaults to false. */
  verified: boolean;
  ads_tier: AdsTier;
  status: Status;
  reject_reason: string | null;
  kyc_status: KycStatus;
  created_at: string;
  updated_at: string;
  /** Optional product card previews — populated by listSponsorShops / listShops for the hero banner card stack. */
  product_cards?: ProductCard[];
};

/** One duration-based pricing bracket. per_day = THB/day; max=null means open-ended (X+ days). */
export type PriceTier = { min: number; max: number | null; per_day: number };

export type Product = {
  id: string;
  slug: string;
  tag_code: string;
  name: string;
  designer: string | null;
  shop_id: string;
  /** Joined from shops.name — populated by the product mapper. */
  shop_name: string;
  /** Denormalized from shops.verified — populated by listProducts(). */
  shop_verified?: boolean;
  /** Denormalized from the product's shop area key — populated by listProducts(). Used for distance display. */
  area_key?: string | null;
  /** Business key of the product type (e.g. "dress") — joined from product_types. */
  product_type_key: string;
  /** Business key of the product's category (nullable — uncategorized allowed). */
  category_key?: string | null;
  size: Size;
  color: Color | null;
  /** Starting/base per-day rate (THB). Fallback when no tiers; also the "from" price for cards & filters. */
  price_per_day: number;
  /**
   * Optional duration-based pricing. Contiguous day ranges, each with a per-day
   * rate (longer = cheaper/day). Last tier has max=null (open-ended "X+ days").
   * When null/empty, pricing falls back to price_per_day. See lib/pricing.ts.
   */
  price_tiers: PriceTier[] | null;
  deposit: number;
  description: string | null;
  images: string[];
  occasions: OccasionKey[];
  line_url: string;
  ads_tier: AdsTier;
  featured: boolean;
  sponsored: boolean;
  status: Status;
  reject_reason: string | null;
  available: boolean;
  views: number;
  created_at: string;
  updated_at: string;
};

export type ProductWithShop = Product & {
  shop: Shop;
};

export type Blackout = {
  product_id: string;
  date: string;
  created_at: string;
};

/* ----------------------------- bookings ----------------------------- */

export type Address = {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  address_text: string;
  is_default: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  renter_id: string;
  boutique_id: string;
  dress_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  rental_total: number;
  deposit: number;
  shipping_fee: number | null; // null until seller sets on accept
  /** Platform commission snapshot (see lib/bookings.ts commissionAmount). */
  commission_rate: number;
  commission_amount: number | null;
  /** Renter's first-touch acquisition channel (attribution). */
  channel: string | null;
  status: BookingStatus;
  slip_path: string | null;
  address_id: string | null;
  recipient_name: string | null; // snapshot at booking time
  phone: string | null;
  address_text: string | null;
  current_due_at: string | null;
  cancel_reason: string | null;
  cancel_from_status: string | null;
  created_at: string;
  updated_at: string;
};

/** Booking joined with dress + boutique for list/detail rendering. */
export type BookingDetail = Booking & {
  dress_name: string | null;
  dress_slug: string | null;
  dress_image: string | null;
  boutique_name: string | null;
  boutique_slug: string | null;
  boutique_line_url: string | null;
  boutique_promptpay_id: string | null;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  line_id: string | null;
  role: "customer" | "seller" | "admin";
  saved_dress_ids: string[];
  created_at: string;
  updated_at: string;
};

/* ---------------------------- analytics ----------------------------- */

/** Acquisition channel buckets — mirrors lib/attribution.ts Channel. */
export type Channel =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "line"
  | "google"
  | "youtube"
  | "twitter"
  | "email"
  | "referral"
  | "direct"
  | "other";

/** Visitor pageview event (general traffic analytics). */
export type PageView = {
  /** uuid (was bigint serial pre-restructure). */
  id: string;
  session_id: string | null;
  user_id: string | null;
  path: string | null;
  channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  province: string | null;
  country: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type SubscriptionPlan = "free" | "boost" | "featured";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";

/** Shop paid-plan record (drives adoption-rate → revenue reporting). */
export type ShopSubscription = {
  id: string;
  shop_id: string | null;
  owner_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number; // THB per cycle
  billing_cycle: "monthly" | "yearly";
  started_at: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

// UI palette (mirrors PALETTE in demo's JS)
export const PALETTE: Record<Color, { c1: string; c2: string; c3: string }> = {
  rose: { c1: "#F4D7D2", c2: "#D9938E", c3: "#7C3D3F" },
  ivory: { c1: "#F4ECDA", c2: "#D4BD96", c3: "#6E5A38" },
  green: { c1: "#D9E5D4", c2: "#7FA887", c3: "#2B4A33" },
  black: { c1: "#3F3D3B", c2: "#1F1D1B", c3: "#0A0908" },
  navy: { c1: "#3E4A6E", c2: "#1F2A4A", c3: "#0E1733" },
  red: { c1: "#E5B0AB", c2: "#A33A36", c3: "#3E0807" },
  blue: { c1: "#D9E6F0", c2: "#7BA8C9", c3: "#23435C" },
  purple: { c1: "#E0D5EA", c2: "#9F86C0", c3: "#3D2E5C" },
};

export const COLOR_LABELS_TH: Record<Color, string> = {
  rose: "กุหลาบ",
  ivory: "งาช้าง",
  green: "เขียว",
  black: "ดำ",
  navy: "กรมท่า",
  red: "แดง",
  blue: "ฟ้า",
  purple: "ม่วง",
};

// NOTE: COLOR_SWATCH is shop-theme-only (Shop.coverColor). Product/browse swatches come from Tag.swatchHex.
export const COLOR_SWATCH: Record<Color, string> = {
  rose: "#D9A4A0",
  ivory: "#EFE3CC",
  green: "#2F6F4E",
  black: "#1A1815",
  navy: "#1F2A4A",
  red: "#B5302C",
  blue: "#7BA8C9",
  purple: "#A48BC4",
};
