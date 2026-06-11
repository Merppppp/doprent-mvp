// ── Local product imagery ─────────────────────────────────────────────────────
// Demo dresses ship with generated images in `public/products/<slug>.png`.
// Files are produced by a separate pipeline, so consumers MUST keep a runtime
// fallback (DressArt) in case a file is missing — never hard-depend on these.

const LOCAL_PRODUCT_SLUGS = new Set([
  "rose-silk-midi",
  "ivory-pleated-gown",
  "emerald-velvet-cocktail",
  "noir-silk-slip",
  "blush-tulle-ball",
  "navy-sequin-mini",
  "champagne-lace-midi",
  "scarlet-satin-column",
  "powder-blue-tea",
  "onyx-tuxedo-jumpsuit",
  "lilac-organza-gown",
  "classic-black-suit",
]);

/** Returns `/products/<slug>.png` for known demo slugs, else null. */
export function localProductImage(slug: string): string | null {
  return LOCAL_PRODUCT_SLUGS.has(slug) ? `/products/${slug}.png` : null;
}
