"use server";

import { db } from "@/lib/db";
import { listProducts } from "@/lib/products";

export type SearchSuggestProduct = {
  slug: string;
  name: string;
  image: string | null;
  shopName: string;
};

export type SearchSuggestShop = {
  slug: string;
  name: string;
};

export type SearchSuggestResult = {
  products: SearchSuggestProduct[];
  shops: SearchSuggestShop[];
  /** Distinct designer/brand names that match — clicking runs a full search. */
  brands: string[];
};

const EMPTY: SearchSuggestResult = { products: [], shops: [], brands: [] };

/**
 * Typeahead for the navbar search box. The PRODUCT suggestions are produced by
 * the SAME engine the Enter-key full search uses — `listProducts({ search })` —
 * so the dropdown mirrors the real results as closely as possible. That covers
 * every searchable metric: product name, designer/brand, description, shop name,
 * and tags (occasion, colour, …) via pg_trgm ranking, with a substring fallback.
 *
 * Shops + brands are added as convenience jump-shortcuts on top. Only
 * public / live+available items are surfaced.
 */
export async function searchSuggest(rawQuery: string): Promise<SearchSuggestResult> {
  const q = rawQuery.trim();
  if (q.length < 2) return EMPTY;

  const [productResult, shops, brandRows] = await Promise.all([
    // Same ranked search as pressing Enter (trigram over all metrics + fallback).
    listProducts({ search: q, limit: 6 }),
    db.shop.findMany({
      where: {
        status: "live",
        name: { contains: q, mode: "insensitive" },
      },
      orderBy: [{ featured: "desc" }, { ratingCount: "desc" }],
      take: 3,
      select: { slug: true, name: true },
    }),
    db.product.findMany({
      where: {
        status: "live",
        available: true,
        designer: { contains: q, mode: "insensitive" },
      },
      distinct: ["designer"],
      orderBy: { designer: "asc" },
      take: 12,
      select: { designer: true },
    }),
  ]);

  const brands = Array.from(
    new Set(
      brandRows
        .map((r) => r.designer?.trim())
        .filter((d): d is string => !!d),
    ),
  ).slice(0, 4);

  return {
    products: productResult.items.map((p) => ({
      slug: p.slug,
      name: p.name,
      image: p.images[0] ?? null,
      shopName: p.shop_name,
    })),
    shops: shops.map((s) => ({ slug: s.slug, name: s.name })),
    brands,
  };
}
