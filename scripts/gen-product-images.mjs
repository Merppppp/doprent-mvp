#!/usr/bin/env node
/**
 * gen-product-images.mjs — fill in product images for dresses that have none.
 *
 * Pipeline per dress with images = [] — EVERY dress gets a UNIQUE image
 * (host directive 2026-06-11: "ชุดที่ gen ห้ามซ้ำ" — variants must not share):
 *   1. Source image: existing public/products/<slug>.png (exact slug only),
 *      else AI-generate via ai-teams gen-image.sh (codex provider) with a
 *      per-slug pose/styling variation so same-design variants look distinct.
 *   2. Compress with sharp → WebP 768x1152 (~30-80 KB).
 *   3. Upload to S3-compatible bucket (MinIO dev / R2 prod via S3_* env)
 *      under products/<slug>.webp.
 *   4. Update dress.images = [publicUrl] in DB.
 *
 * Usage:
 *   node --env-file=.env scripts/gen-product-images.mjs [--dry-run] [--limit N]
 *        [--concurrency N] [--only <slug>]
 *
 * Idempotent: dresses that already have images are never touched; existing
 * local PNGs are reused, never re-generated.
 */
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ── config ──────────────────────────────────────────────────────────────────
const GEN_SCRIPT =
  process.env.GEN_IMAGE_SH ||
  `${process.env.HOME}/Library/Mobile Documents/com~apple~CloudDocs/ai-tools/ai-teams/scripts/gen-image.sh`;
const LOCAL_DIR = path.resolve(process.cwd(), "public/products");
const SKIP_SLUGS = new Set(["test001-4u8lg", "ชื่อชุด-1n5vd"]);
const WIDTH = 768;
const HEIGHT = 1152;

// ── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const DRY_RUN = flag("--dry-run");
const LIMIT = Number(opt("--limit", Infinity));
const CONCURRENCY = Number(opt("--concurrency", 4));
const ONLY = opt("--only", null);

// ── env / clients ───────────────────────────────────────────────────────────
for (const k of ["S3_ENDPOINT", "S3_BUCKET", "S3_PUBLIC_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing env ${k} — run with: node --env-file=.env scripts/gen-product-images.mjs`);
    process.exit(1);
  }
}
const db = new PrismaClient();
const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

// ── helpers ─────────────────────────────────────────────────────────────────

// Per-slug deterministic variation so same-design variants render distinct.
const POSES = [
  "elegant standing pose, facing the camera straight on",
  "three-quarter angle pose with one hand resting on the hip",
  "graceful side-profile pose, face turned toward the camera",
  "mid-stride walking pose toward the camera",
  "relaxed pose with hands gently clasped in front",
  "confident pose with one hand brushing the hair back",
];
const STYLES = [
  "hair worn down in soft waves",
  "hair in an elegant low bun",
  "hair in a sleek high ponytail",
  "hair half-up half-down",
];
function slugHash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function buildPrompt(d) {
  const desc = d.description ? ` ${d.description}.` : "";
  const h = slugHash(d.slug);
  const pose = POSES[h % POSES.length];
  const style = STYLES[(h >>> 3) % STYLES.length];
  return (
    `Professional fashion e-commerce product photo: ${d.name} (${d.color} color).${desc} ` +
    "A beautiful Thai fashion model wearing the garment (use a male model for suits/tuxedos, " +
    `female model for dresses/gowns), full-length shot, face visible with a natural confident ` +
    `expression, ${pose}, ${style}, a unique model with a distinct face — not similar to other ` +
    "product photos in the catalog, soft studio lighting, clean warm light-gray seamless " +
    "background, photorealistic, high detail fabric texture, portrait orientation, no text, no watermark."
  );
}

// Reuse a local PNG only for the EXACT slug — variants must get their own image.
function findLocalPng(d) {
  const p = path.join(LOCAL_DIR, `${d.slug}.png`);
  return fs.existsSync(p) && fs.statSync(p).size > 0 ? p : null;
}

async function generateImage(d, outPath) {
  const prompt = buildPrompt(d);
  console.log(`  [gen] ${path.basename(outPath)} …`);
  // NOTE: stdin MUST be 'ignore' — codex CLI otherwise blocks on
  // "Reading additional input from stdin..." until timeout.
  await new Promise((resolve, reject) => {
    const child = spawn(
      "bash",
      [GEN_SCRIPT, prompt, outPath, "--provider", "codex", "--size", "1024x1536"],
      { stdio: ["ignore", "ignore", "pipe"], timeout: 600_000 }
    );
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`gen-image exit ${code}: ${stderr.slice(-300)}`))
    );
  });
  if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
    throw new Error(`gen-image produced no output for ${outPath}`);
  }
}

async function uploadWebp(srcPng, key) {
  const buf = await sharp(srcPng)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buf,
      ContentType: "image/webp",
    })
  );
  return { url: `${process.env.S3_PUBLIC_URL}/${key}`, kb: Math.round(buf.length / 1024) };
}

// simple promise pool
async function pool(items, n, fn) {
  const queue = [...items];
  const results = [];
  await Promise.all(
    Array.from({ length: Math.min(n, queue.length) }, async () => {
      while (queue.length) results.push(await fn(queue.shift()));
    })
  );
  return results;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const rows = await db.dress.findMany({
    select: { id: true, slug: true, name: true, color: true, description: true, images: true },
    orderBy: { slug: "asc" },
  });
  let targets = rows.filter(
    (r) => Array.isArray(r.images) && r.images.length === 0 && !SKIP_SLUGS.has(r.slug)
  );
  if (ONLY) targets = targets.filter((r) => r.slug === ONLY);
  targets = targets.slice(0, LIMIT);

  console.log(`dresses without images: ${targets.length} (1 unique image each)`);

  let ok = 0, fail = 0;
  await pool(targets, CONCURRENCY, async (d) => {
    const key = `products/${d.slug}.webp`;
    try {
      let src = findLocalPng(d);
      if (DRY_RUN) {
        console.log(`[dry] ${key}  src=${src ? path.basename(src) : "GENERATE"}`);
        ok++;
        return;
      }
      if (!src) {
        src = path.join(LOCAL_DIR, `${d.slug}.png`);
        await generateImage(d, src);
      }
      const { url, kb } = await uploadWebp(src, key);
      await db.dress.update({ where: { id: d.id }, data: { images: [url] } });
      console.log(`OK ${key} (${kb} KB)`);
      ok++;
    } catch (e) {
      console.error(`FAIL ${key}: ${e.message}`);
      fail++;
    }
  });

  console.log(`\nDONE ok=${ok} fail=${fail}`);
  await db.$disconnect();
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
