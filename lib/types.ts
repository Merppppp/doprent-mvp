// Types mirror the Supabase schema (see supabase/schema.sql)

export type Color =
  | "rose"
  | "ivory"
  | "green"
  | "black"
  | "navy"
  | "red"
  | "blue"
  | "purple";

export type Size = "XS" | "S" | "M" | "L" | "XL";

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

export type Occasion = {
  key: OccasionKey;
  th: string;
  en: string;
  color_token: Color;
  sort_order: number;
};

export type Area = {
  key: string;
  th: string;
  lat: number;
  lng: number;
  keywords: string[];
};

export type Boutique = {
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
  since_year: number | null;
  cover_color: Color;
  tag: string | null;
  story: string | null;
  featured: boolean;
  /** Admin-toggled trust mark (post-KYC). Defaults to false. */
  verified: boolean;
  ads_tier: AdsTier;
  status: Status;
  reject_reason: string | null;
  kyc_status: KycStatus;
  created_at: string;
  updated_at: string;
};

export type Dress = {
  id: string;
  slug: string;
  name: string;
  designer: string | null;
  boutique_id: string;
  boutique_name: string;
  /** Denormalized from boutiques.verified — populated by listDresses(). */
  boutique_verified?: boolean;
  size: Size;
  color: Color;
  price_per_day: number;
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

export type DressWithBoutique = Dress & {
  boutique: Boutique;
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
