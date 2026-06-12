import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/products";
import type { Color, OccasionKey } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const color = sp.get("color") as Color | null;
    const occasion = sp.get("occasion") as OccasionKey | null;
    const size = sp.get("size");
    const designer = sp.get("designer");
    const category = sp.get("category");
    const q = sp.get("q");
    const sort = sp.get("sort") as "featured" | "price-asc" | "price-desc" | "name" | null;
    const page = Number(sp.get("page")) || 1;
    const priceMin = sp.get("priceMin") ? Number(sp.get("priceMin")) : undefined;
    const priceMax = sp.get("priceMax") ? Number(sp.get("priceMax")) : undefined;
    const dateFrom = sp.get("dateFrom") || undefined;
    const dateTo = sp.get("dateTo") || undefined;

    const result = await listProducts({
      color: color ?? undefined,
      occasions: occasion ? [occasion] : undefined,
      sizes: size ? [size] : undefined,
      designers: designer ? [designer] : undefined,
      category: category ?? undefined,
      search: q || undefined,
      sort: sort ?? "featured",
      page,
      priceMin,
      priceMax,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
