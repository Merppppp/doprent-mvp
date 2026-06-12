/**
 * One-shot data migration: copy dress image URLs from the VPS dev DB
 * (old schema — `dresses.images` jsonb) into the local restructured DB
 * (`product_images` rows), matched by slug (fallback: exact name).
 *
 * - READ-ONLY against the remote dev DB (single SELECT).
 * - Writes only to the local DB pointed at by DATABASE_URL
 *   (expected: doprent_restructure).
 * - Idempotent: products that already have product_images rows are skipped.
 *
 * Run: npx tsx scripts/import-product-images-from-dev.ts
 */
import { PrismaClient } from "@prisma/client";

// Remote dev DB (old schema). Password contains "+" → must be URL-encoded
// (%2B) or Prisma misparses the URL (see project memory: db-password-url-encode).
const DEV_DB_URL =
  process.env.DEV_DB_URL ??
  "postgresql://doprent_dev_full:uDFOONScYGQqA%2BKOMSKbAZyrrX3gQDPd@157.85.101.85:5432/doprent_dev";

const local = new PrismaClient(); // uses DATABASE_URL from .env (local restructure DB)
const dev = new PrismaClient({ datasources: { db: { url: DEV_DB_URL } } });

type DevDress = { id: string; slug: string; name: string; images: unknown };

function toUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((u): u is string => typeof u === "string" && u.length > 0);
}

async function main() {
  // READ-ONLY select from the old-schema dev DB (raw SQL — the generated
  // Prisma client no longer knows the `dresses` table).
  const devDresses = await dev.$queryRaw<DevDress[]>`
    SELECT id::text AS id, slug, name, images FROM dresses
  `;
  console.log(`dev DB: ${devDresses.length} dresses fetched`);

  const products = await local.product.findMany({
    select: { id: true, slug: true, name: true, _count: { select: { images: true } } },
  });
  console.log(`local DB: ${products.length} products`);

  const bySlug = new Map(devDresses.map((d) => [d.slug, d]));
  const byName = new Map(devDresses.map((d) => [d.name, d]));

  let matchedBySlug = 0;
  let matchedByName = 0;
  let skippedExisting = 0;
  let unmatched = 0;
  let imagesInserted = 0;
  const unmatchedSlugs: string[] = [];

  for (const p of products) {
    if (p._count.images > 0) {
      skippedExisting++;
      continue;
    }
    let src = bySlug.get(p.slug);
    if (src) {
      matchedBySlug++;
    } else {
      src = byName.get(p.name);
      if (src) matchedByName++;
    }
    if (!src) {
      unmatched++;
      unmatchedSlugs.push(p.slug);
      continue;
    }
    const urls = toUrls(src.images);
    if (urls.length === 0) continue;
    await local.productImage.createMany({
      data: urls.map((url, i) => ({ productId: p.id, url, sortOrder: i })),
    });
    imagesInserted += urls.length;
  }

  console.log("--- import-product-images-from-dev report ---");
  console.log(`matched by slug:      ${matchedBySlug}`);
  console.log(`matched by name:      ${matchedByName}`);
  console.log(`skipped (had images): ${skippedExisting}`);
  console.log(`unmatched products:   ${unmatched}`);
  if (unmatchedSlugs.length) console.log(`  slugs: ${unmatchedSlugs.join(", ")}`);
  console.log(`product_images rows inserted: ${imagesInserted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([local.$disconnect(), dev.$disconnect()]);
  });
