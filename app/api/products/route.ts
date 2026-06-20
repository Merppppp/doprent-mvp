import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/products";
import type { Color } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const color = sp.get("color") as Color | null;
    const KNOWN_PARAMS = new Set([
      "color", "occasion", "size", "designer", "q", "sort",
      "dateFrom", "dateTo", "priceMin", "priceMax", "page", "type",
      "bustMin", "bustMax", "waistMin", "waistMax", "lengthMin", "lengthMax",
      "openOnly",
    ]);
    const tagsByGroup: Record<string, string[]> = {};
    for (const [key, value] of sp.entries()) {
      if (!KNOWN_PARAMS.has(key) && value) {
        tagsByGroup[key] = value.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    // Backward compat: occasion URL param
    const rawOccasion = sp.get("occasion");
    if (rawOccasion) {
      const occKeys = rawOccasion.split(",").map((s) => s.trim()).filter(Boolean);
      const prev = tagsByGroup.occasion ?? [];
      tagsByGroup.occasion = [...new Set([...prev, ...occKeys])];
    }
    const size = sp.get("size");
    const designer = sp.get("designer");
    const category = sp.get("category");
    const q = sp.get("q");
    const sort = sp.get("sort") as "featured" | "price-asc" | "price-desc" | "name" | null;
    const page = Number(sp.get("page")) || 1;
    const priceMin = sp.get("priceMin") ? Number(sp.get("priceMin")) : undefined;
    const priceMax = sp.get("priceMax") ? Number(sp.get("priceMax")) : undefined;
    const bustMin = sp.get("bustMin") ? Number(sp.get("bustMin")) : undefined;
    const bustMax = sp.get("bustMax") ? Number(sp.get("bustMax")) : undefined;
    const waistMin = sp.get("waistMin") ? Number(sp.get("waistMin")) : undefined;
    const waistMax = sp.get("waistMax") ? Number(sp.get("waistMax")) : undefined;
    const lengthMin = sp.get("lengthMin") ? Number(sp.get("lengthMin")) : undefined;
    const lengthMax = sp.get("lengthMax") ? Number(sp.get("lengthMax")) : undefined;
    const dateFrom = sp.get("dateFrom") || undefined;
    const dateTo = sp.get("dateTo") || undefined;
    const KNOWN_TYPE_KEYS = ["dress", "suit"];
    const rawType = sp.get("type")?.trim();
    const productTypeKey = rawType && KNOWN_TYPE_KEYS.includes(rawType) ? rawType : undefined;
    const openOnly = sp.get("openOnly") === "1";

    const result = await listProducts({
      color: color ?? undefined,
      tagsByGroup: Object.keys(tagsByGroup).length > 0 ? tagsByGroup : undefined,
      sizes: size ? [size] : undefined,
      designers: designer ? [designer] : undefined,
      category: category ?? undefined,
      search: q || undefined,
      sort: sort ?? "featured",
      page,
      priceMin,
      priceMax,
      bustMin,
      bustMax,
      waistMin,
      waistMax,
      lengthMin,
      lengthMax,
      dateFrom,
      dateTo,
      productTypeKey,
      openOnly,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
