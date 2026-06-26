/**
 * Clone CATALOG (shops + products + children) from dev → uat.
 *
 * Scope (no users / bookings / kyc):
 *   shops, products, product_variants, product_images,
 *   product_price_tiers, product_blackout_dates, product_tags
 *
 * Taxonomy (areas, tags, product_types, product_categories) is NOT cloned —
 * it already exists in both DBs but with DIFFERENT uuids, so FK columns are
 * remapped by business `key`. Shop owner_id is set NULL unless that user also
 * exists in uat (users are out of scope).
 *
 * Connection strings via env: SRC_DATABASE_URL (dev), TGT_DATABASE_URL (uat).
 * Dry-run by default. Set APPLY=1 to actually write (single transaction).
 *
 * Run (preview):  SRC_DATABASE_URL=... TGT_DATABASE_URL=... npx tsx scripts/clone-catalog-to-uat.ts
 * Run (apply):    APPLY=1 SRC_DATABASE_URL=... TGT_DATABASE_URL=... npx tsx scripts/clone-catalog-to-uat.ts
 */
import { Client } from "pg";

const APPLY = process.env.APPLY === "1";

function log(m: string) {
  console.log(`[clone] ${m}`);
}

/** Real (non-generated) column names for a table, in ordinal order. */
async function columnsOf(c: Client, table: string): Promise<string[]> {
  const r = await c.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'NEVER'
     ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((x) => x.column_name);
}

/** Build dev-id → uat-id translation via a shared business key column. */
async function idMapByKey(
  src: Client,
  tgt: Client,
  table: string,
  keyCol: string,
): Promise<Map<string, string>> {
  const [s, t] = await Promise.all([
    src.query<{ id: string; k: string }>(`SELECT id, ${keyCol} AS k FROM ${table}`),
    tgt.query<{ id: string; k: string }>(`SELECT id, ${keyCol} AS k FROM ${table}`),
  ]);
  const tgtKeyToId = new Map(t.rows.map((r) => [r.k, r.id]));
  const map = new Map<string, string>();
  for (const r of s.rows) {
    const uatId = tgtKeyToId.get(r.k);
    if (uatId) map.set(r.id, uatId);
  }
  return map;
}

type RowXform = (row: Record<string, unknown>) => Record<string, unknown> | null;

/**
 * Copy a table dev→uat. `xform` may rewrite FK columns or return null to skip.
 * Uses the dev column set; INSERT ... ON CONFLICT (id) DO NOTHING (idempotent).
 */
async function copyTable(
  src: Client,
  tgt: Client,
  table: string,
  xform: RowXform,
): Promise<{ read: number; written: number; skipped: number }> {
  const cols = await columnsOf(src, table);
  const sel = await src.query<Record<string, unknown>>(`SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM ${table}`);
  let written = 0;
  let skipped = 0;
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const insertSql = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")})
                     VALUES (${placeholders})
                     ON CONFLICT (id) DO NOTHING`;
  for (const raw of sel.rows) {
    const row = xform(raw);
    if (row === null) {
      skipped++;
      continue;
    }
    const values = cols.map((c) => row[c] ?? null);
    if (APPLY) await tgt.query(insertSql, values);
    written++;
  }
  return { read: sel.rows.length, written, skipped };
}

async function main() {
  const srcUrl = process.env.SRC_DATABASE_URL;
  const tgtUrl = process.env.TGT_DATABASE_URL;
  if (!srcUrl || !tgtUrl) throw new Error("Set SRC_DATABASE_URL and TGT_DATABASE_URL");

  const src = new Client({ connectionString: srcUrl });
  const tgt = new Client({ connectionString: tgtUrl });
  await src.connect();
  await tgt.connect();
  log(`mode = ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"}`);

  try {
    // ---- id-translation maps (dev id → uat id) ----
    log("building taxonomy id maps by key…");
    const areaMap = await idMapByKey(src, tgt, "areas", "key");
    const ptMap = await idMapByKey(src, tgt, "product_types", "key");
    const catMap = await idMapByKey(src, tgt, "product_categories", "key");
    const tagMap = await idMapByKey(src, tgt, "tags", "key");
    log(`  areas:${areaMap.size} product_types:${ptMap.size} categories:${catMap.size} tags:${tagMap.size}`);

    const uatUsers = await tgt.query<{ id: string }>(`SELECT id FROM users`);
    const uatUserIds = new Set(uatUsers.rows.map((r) => r.id));

    // Warn on any dev tag keys that have no uat counterpart (would drop product_tags)
    const devTagKeys = await src.query<{ id: string; key: string }>(`SELECT id, key FROM tags`);
    const unmapped = devTagKeys.rows.filter((r) => !tagMap.has(r.id)).map((r) => r.key);
    if (unmapped.length) log(`  WARN: dev tag keys missing in uat: ${unmapped.join(", ")}`);

    if (APPLY) await tgt.query("BEGIN");

    // ---- shops: owner_id → null unless present in uat; area_id remap ----
    const shopRes = await copyTable(src, tgt, "shops", (row) => {
      const out = { ...row };
      out.owner_id = row.owner_id && uatUserIds.has(row.owner_id as string) ? row.owner_id : null;
      out.area_id = row.area_id ? areaMap.get(row.area_id as string) ?? null : null;
      return out;
    });
    log(`shops: read ${shopRes.read} → write ${shopRes.written}`);

    // ---- products: product_type_id + category_id remap ----
    const prodRes = await copyTable(src, tgt, "products", (row) => {
      const out = { ...row };
      const pt = ptMap.get(row.product_type_id as string);
      if (!pt) return null; // product_type missing in uat — cannot insert
      out.product_type_id = pt;
      out.category_id = row.category_id ? catMap.get(row.category_id as string) ?? null : null;
      return out;
    });
    log(`products: read ${prodRes.read} → write ${prodRes.written} (skipped ${prodRes.skipped})`);

    // ---- product children (no taxonomy FK to remap) ----
    for (const t of ["product_variants", "product_images", "product_price_tiers", "product_blackout_dates"]) {
      const r = await copyTable(src, tgt, t, (row) => row);
      log(`${t}: read ${r.read} → write ${r.written}`);
    }

    // ---- product_tags: tag_id remap (drop rows whose tag has no uat match) ----
    const ptagRes = await copyTable(src, tgt, "product_tags", (row) => {
      const tag = tagMap.get(row.tag_id as string);
      if (!tag) return null;
      return { ...row, tag_id: tag };
    });
    log(`product_tags: read ${ptagRes.read} → write ${ptagRes.written} (skipped ${ptagRes.skipped})`);

    if (APPLY) {
      await tgt.query("COMMIT");
      log("COMMIT ✓");
    } else {
      log("DRY-RUN complete — re-run with APPLY=1 to write.");
    }
  } catch (e) {
    if (APPLY) await tgt.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await src.end();
    await tgt.end();
  }
}

main().catch((e) => {
  console.error("[clone] FATAL:", e.message);
  process.exit(1);
});
