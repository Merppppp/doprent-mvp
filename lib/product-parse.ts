import { type Size, SIZES } from "@/lib/types";

/** Valid Size enum values in the DB — mirrors the canonical SIZES list. */
export type DbSize = Size;
export const VALID_SIZES = new Set<string>(SIZES);

export type VariantInput = {
  size: DbSize;
  quantity: number;
  available: boolean;
  bustCm: number | null;
  waistCm: number | null;
  lengthCm: number | null;
};

type TierInput = { minDays: number; pricePerDay: number };
type SharedTiers = TierInput[];
type PerSizeTiers = { size: DbSize; tiers: TierInput[] }[];

/**
 * Parse a `variants` JSON field from a FormData submission.
 * Returns an empty array if the field is absent or malformed.
 * Only rows with a valid Size enum value are included.
 */
export function parseVariants(formData: FormData): VariantInput[] {
  const raw = formData.get("variants");
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const parseNullableInt = (v: unknown): number | null => {
      if (v === null || v === undefined || String(v).trim() === "") return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };
    return (parsed as Array<Record<string, unknown>>)
      .filter((r) => typeof r === "object" && r !== null && VALID_SIZES.has(String(r.size ?? "")))
      .map((r) => ({
        size: String(r.size) as DbSize,
        quantity: Math.max(1, parseInt(String(r.quantity ?? "1"), 10) || 1),
        available: r.available !== false,
        bustCm: parseNullableInt(r.bustCm ?? r.bust_cm),
        waistCm: parseNullableInt(r.waistCm ?? r.waist_cm),
        lengthCm: parseNullableInt(r.lengthCm ?? r.length_cm),
      }));
  } catch {
    return [];
  }
}

/** Validate a set of tier entries: at least one with minDays=1, all minDays>=1, pricePerDay>=0, unique minDays. */
export function validateTierSet(tiers: TierInput[], label?: string): { ok: boolean; error?: string } {
  if (!tiers.length) return { ok: false, error: `${label ? label + ': ' : ''}ต้องมีอย่างน้อย 1 ช่วงราคา` };
  if (!tiers.some((t) => t.minDays === 1)) return { ok: false, error: `${label ? label + ': ' : ''}ต้องมีช่วงเริ่มต้นที่ 1 วัน` };
  for (const t of tiers) {
    if (!Number.isInteger(t.minDays) || t.minDays < 1) return { ok: false, error: `${label ? label + ': ' : ''}จำนวนวันขั้นต่ำต้องเป็นจำนวนเต็ม >= 1` };
    if (!Number.isInteger(t.pricePerDay) || t.pricePerDay < 0) return { ok: false, error: `${label ? label + ': ' : ''}ราคาต้องเป็นจำนวนเต็ม >= 0` };
  }
  const mins = tiers.map((t) => t.minDays);
  if (new Set(mins).size !== mins.length) return { ok: false, error: `${label ? label + ': ' : ''}จำนวนวัน (minDays) ซ้ำกัน` };
  // ราคาเช่าต่อวันต้องอย่างน้อย ฿100 (รักษา behavior เดิม กัน seller ตั้ง ฿0)
  if (Math.min(...tiers.map((t) => t.pricePerDay)) < 100) return { ok: false, error: `${label ? label + ': ' : ''}ราคาเช่าต่อวันต้องอย่างน้อย ฿100` };
  return { ok: true };
}

/** Parse the price_mode + price_tiers fields from form data. Returns null on parse error. */
export function parsePriceTiersFromForm(formData: FormData):
  | { mode: "shared"; shared: SharedTiers; deposit: number }
  | { mode: "per_size"; perSize: PerSizeTiers; deposit: number }
  | { ok: false; error: string } {
  const mode = String(formData.get("price_mode") ?? "shared") as "shared" | "per_size";
  const depositRaw = parseInt(String(formData.get("deposit") ?? "0"), 10);
  const deposit = isNaN(depositRaw) || depositRaw < 0 ? 0 : depositRaw;
  const raw = formData.get("price_tiers");
  if (!raw || typeof raw !== "string") return { ok: false, error: "ไม่พบข้อมูลราคา" };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: "ข้อมูลราคาไม่ถูกต้อง" }; }
  if (!Array.isArray(parsed)) return { ok: false, error: "ข้อมูลราคาต้องเป็น array" };

  if (mode === "per_size") {
    const perSize: PerSizeTiers = [];
    for (const item of parsed as Array<Record<string, unknown>>) {
      const size = String(item.size ?? "");
      if (!VALID_SIZES.has(size)) return { ok: false, error: `ไซซ์ไม่ถูกต้อง: ${size}` };
      const ts = item.tiers;
      if (!Array.isArray(ts)) return { ok: false, error: `tiers ของไซซ์ ${size} ต้องเป็น array` };
      const tiers: TierInput[] = ts.map((t: Record<string, unknown>) => ({
        minDays: parseInt(String(t.minDays ?? "0"), 10),
        pricePerDay: parseInt(String(t.pricePerDay ?? "0"), 10),
      }));
      const v = validateTierSet(tiers, `ไซซ์ ${size}`);
      if (!v.ok) return { ok: false, error: v.error! };
      perSize.push({ size: size as DbSize, tiers });
    }
    if (perSize.length === 0) return { ok: false, error: "ต้องมีข้อมูลราคาอย่างน้อย 1 ไซซ์" };
    return { mode: "per_size", perSize, deposit };
  } else {
    const shared: SharedTiers = (parsed as Array<Record<string, unknown>>).map((t) => ({
      minDays: parseInt(String(t.minDays ?? "0"), 10),
      pricePerDay: parseInt(String(t.pricePerDay ?? "0"), 10),
    }));
    const v = validateTierSet(shared);
    if (!v.ok) return { ok: false, error: v.error! };
    return { mode: "shared", shared, deposit };
  }
}

export function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function productSlug(name: string): string {
  const base = slugify(name);
  return base ? `${base}-${Date.now().toString(36).slice(-5)}` : `d-${Date.now().toString(36)}`;
}
