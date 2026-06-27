/**
 * Surgical occasion-tag taxonomy sync for ONE database (TGT_DATABASE_URL).
 * Adds the 5 new occasion tags and deactivates the 3 retired ones. Touches
 * ONLY the `tags` table (group 'occasion') — no users / catalog / settings.
 *
 * Dry-run by default; APPLY=1 to write.
 * Run:  APPLY=1 TGT_DATABASE_URL=... npx tsx scripts/sync-occasion-tags.ts
 */
import { Client } from "pg";
import { randomUUID } from "crypto";

const APPLY = process.env.APPLY === "1";

const ADD = [
  { key: "swimwear", label: "ชุดว่ายน้ำ" },
  { key: "suit", label: "ชุดสูท" },
  { key: "travel_dress", label: "เดรสไปเที่ยว" },
  { key: "winter", label: "ชุดกันหนาว" },
  { key: "vietnamese", label: "ชุดเวียดนาม" },
];
const RETIRE = ["engagement", "cocktail", "gala"];

async function main() {
  const url = process.env.TGT_DATABASE_URL;
  if (!url) throw new Error("Set TGT_DATABASE_URL");
  const c = new Client({ connectionString: url });
  await c.connect();
  console.log(`[tags] mode = ${APPLY ? "APPLY" : "DRY-RUN"}`);

  try {
    const g = await c.query<{ id: string }>(`SELECT id FROM tag_groups WHERE key = 'occasion'`);
    if (!g.rows.length) throw new Error("tag_group 'occasion' not found in target");
    const groupId = g.rows[0].id;

    if (APPLY) await c.query("BEGIN");

    for (const t of ADD) {
      const exists = await c.query(`SELECT 1 FROM tags WHERE key = $1`, [t.key]);
      if (APPLY) {
        await c.query(
          `INSERT INTO tags (id, tag_group_id, key, label, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, is_active = true, tag_group_id = EXCLUDED.tag_group_id`,
          [randomUUID(), groupId, t.key, t.label],
        );
      }
      console.log(`[tags] add ${t.key} (${t.label}) — ${exists.rowCount ? "update" : "insert"}`);
    }

    const ret = await c.query(`SELECT key FROM tags WHERE key = ANY($1::text[]) AND is_active = true`, [RETIRE]);
    if (APPLY) {
      await c.query(`UPDATE tags SET is_active = false WHERE key = ANY($1::text[])`, [RETIRE]);
    }
    console.log(`[tags] retire (deactivate): ${RETIRE.join(", ")} — currently active: ${ret.rows.map((r) => r.key).join(", ") || "none"}`);

    if (APPLY) {
      await c.query("COMMIT");
      console.log("[tags] COMMIT ✓");
    } else {
      console.log("[tags] DRY-RUN — re-run with APPLY=1 to write.");
    }
  } catch (e) {
    if (APPLY) await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("[tags] FATAL:", (e as Error).message);
  process.exit(1);
});
