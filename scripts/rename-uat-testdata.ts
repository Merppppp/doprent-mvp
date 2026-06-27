/**
 * Rename garbage/test shops & products in UAT to realistic boutique names,
 * matching the seeded English naming style ("<Area> Atelier/Couture/...").
 *
 * Matches by exact current name (the test rows have unique names). Dry-run by
 * default; APPLY=1 to write. Single transaction.
 *
 * Run (preview):  TGT_DATABASE_URL=... npx tsx scripts/rename-uat-testdata.ts
 * Run (apply):    APPLY=1 TGT_DATABASE_URL=... npx tsx scripts/rename-uat-testdata.ts
 */
import { Client } from "pg";

const APPLY = process.env.APPLY === "1";

const SHOP_RENAMES: { from: string; to: string }[] = [
  { from: "SP", to: "Rattanakosin Atelier" },
  { from: "ชื่อร้าน", to: "Phra Nakhon Bridal House" },
  { from: "ชื่อร้าน *", to: "Dusit Couture" },
  { from: "nae", to: "Phaya Thai Studio" },
  { from: "ๅ/-ๅ/", to: "Huai Khwang Eveningwear" },
  { from: "test002", to: "Bang Khen Boutique" },
  { from: "1111", to: "Wang Thonglang Atelier" },
  { from: "Eng's test", to: "Bang Khae Dress Library" },
];

const PRODUCT_RENAMES: { from: string; to: string }[] = [
  { from: "test001", to: "Champagne Beaded Gown" },
  { from: "ชื่อชุด *", to: "Blush Chiffon Midi" },
  { from: "Test111", to: "Emerald Satin Column" },
];

async function main() {
  const url = process.env.TGT_DATABASE_URL;
  if (!url) throw new Error("Set TGT_DATABASE_URL");
  const c = new Client({ connectionString: url });
  await c.connect();
  console.log(`[rename] mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);

  try {
    if (APPLY) await c.query("BEGIN");

    for (const r of SHOP_RENAMES) {
      const res = await c.query(
        `UPDATE shops SET name = $1 WHERE name = $2${APPLY ? "" : " AND false"}`,
        [r.to, r.from],
      );
      const found = await c.query(`SELECT count(*)::int n FROM shops WHERE name = $1`, [r.from]);
      console.log(`[shop] "${r.from}" -> "${r.to}"  (match ${found.rows[0].n}${APPLY ? `, updated ${res.rowCount}` : ""})`);
    }

    for (const r of PRODUCT_RENAMES) {
      const res = await c.query(
        `UPDATE products SET name = $1 WHERE name = $2${APPLY ? "" : " AND false"}`,
        [r.to, r.from],
      );
      const found = await c.query(`SELECT count(*)::int n FROM products WHERE name = $1`, [r.from]);
      console.log(`[product] "${r.from}" -> "${r.to}"  (match ${found.rows[0].n}${APPLY ? `, updated ${res.rowCount}` : ""})`);
    }

    if (APPLY) {
      await c.query("COMMIT");
      console.log("[rename] COMMIT ✓");
    } else {
      console.log("[rename] DRY-RUN — re-run with APPLY=1 to write.");
    }
  } catch (e) {
    if (APPLY) await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error("[rename] FATAL:", (e as Error).message); process.exit(1); });
