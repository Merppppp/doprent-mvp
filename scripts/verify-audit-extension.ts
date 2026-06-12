/**
 * Phase 3 verification — audit extension behavior against the local
 * doprent_restructure DB. Run: npx tsx scripts/verify-audit-extension.ts
 */
import { db, base } from "../lib/db";
import { withActor } from "../lib/db-context";

const ACTOR_A = "11111111-1111-1111-1111-111111111111";
const ACTOR_B = "22222222-2222-2222-2222-222222222222";

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ✅ ${label}`);
  } else {
    failures++;
    console.log(`  ❌ ${label}`, detail !== undefined ? JSON.stringify(detail) : "");
  }
}

async function lastAudit(entityType: string) {
  return base.auditLog.findFirst({
    where: { entityType },
    orderBy: { createdAt: "desc" },
  });
}

async function main() {
  const testIds: string[] = [];

  // --- (a) create with actor -------------------------------------------------
  console.log("(a) withActor create product_type");
  const created = await withActor(ACTOR_A, () =>
    db.productType.create({ data: { key: "test-type", label: "Test" } }),
  );
  testIds.push(created.id);
  check("created_by = actor A", created.createdBy === ACTOR_A, created.createdBy);
  check("updated_by = actor A", created.updatedBy === ACTOR_A, created.updatedBy);
  let audit = await lastAudit("ProductType");
  check("audit action=CREATE", audit?.action === "CREATE", audit?.action);
  check("audit entity_id set", audit?.entityId === created.id, audit?.entityId);
  check("audit actor_id = actor A", audit?.actorId === ACTOR_A, audit?.actorId);
  check("audit after jsonb has key", (audit?.after as any)?.key === "test-type", audit?.after);
  check("audit before is null", audit?.before === null, audit?.before);

  // --- (b) update with different actor ---------------------------------------
  console.log("(b) withActor(B) update");
  const updated = await withActor(ACTOR_B, () =>
    db.productType.update({ where: { id: created.id }, data: { label: "Test v2" } }),
  );
  check("updated_by changed to actor B", updated.updatedBy === ACTOR_B, updated.updatedBy);
  check("created_by unchanged (actor A)", updated.createdBy === ACTOR_A, updated.createdBy);
  audit = await lastAudit("ProductType");
  check("audit action=UPDATE", audit?.action === "UPDATE", audit?.action);
  check(
    "audit before has old label",
    (audit?.before as any)?.label === "Test",
    audit?.before,
  );
  check(
    "audit after has new label",
    (audit?.after as any)?.label === "Test v2",
    audit?.after,
  );

  // --- (c) delete -------------------------------------------------------------
  console.log("(c) delete");
  await withActor(ACTOR_B, () => db.productType.delete({ where: { id: created.id } }));
  audit = await lastAudit("ProductType");
  check("audit action=DELETE", audit?.action === "DELETE", audit?.action);
  check("audit entity_id set", audit?.entityId === created.id, audit?.entityId);
  check(
    "audit before has row image",
    (audit?.before as any)?.key === "test-type",
    audit?.before,
  );
  check("audit after is null", audit?.after === null, audit?.after);

  // --- (d) create WITHOUT withActor -------------------------------------------
  console.log("(d) create without withActor");
  const anon = await db.productType.create({
    data: { key: "test-type-anon", label: "Anon" },
  });
  testIds.push(anon.id);
  check("created_by is NULL", anon.createdBy === null, anon.createdBy);
  audit = await lastAudit("ProductType");
  check("audit actor_id is NULL", audit?.actorId === null, audit?.actorId);
  check("audit entity matches", audit?.entityId === anon.id, audit?.entityId);

  // --- (e) pageView.create — injected but NOT audited --------------------------
  console.log("(e) pageView.create");
  const auditCountBefore = await base.auditLog.count();
  const pv = await withActor(ACTOR_A, () =>
    db.pageView.create({ data: { path: "/__audit-test__" } }),
  );
  const auditCountAfter = await base.auditLog.count();
  check("created_by injected on PageView", pv.createdBy === ACTOR_A, pv.createdBy);
  check("NO audit row for PageView", auditCountAfter === auditCountBefore, {
    before: auditCountBefore,
    after: auditCountAfter,
  });

  // --- (f) updateMany ----------------------------------------------------------
  console.log("(f) updateMany on product_types");
  const pre = await base.auditLog.count({ where: { entityType: "ProductType" } });
  await withActor(ACTOR_A, () =>
    db.productType.updateMany({
      where: { key: "test-type-anon" },
      data: { label: "Anon v2" },
    }),
  );
  const post = await base.auditLog.count({ where: { entityType: "ProductType" } });
  check("exactly ONE audit row for updateMany", post === pre + 1, { pre, post });
  audit = await lastAudit("ProductType");
  check("bulk audit entity_id is null", audit?.entityId === null, audit?.entityId);
  check(
    "bulk audit after has filter+payload",
    (audit?.after as any)?.bulk === "updateMany" &&
      (audit?.after as any)?.where?.key === "test-type-anon",
    audit?.after,
  );
  const anonAfter = await base.productType.findUnique({ where: { id: anon.id } });
  check("updateMany stamped updated_by", anonAfter?.updatedBy === ACTOR_A, anonAfter?.updatedBy);

  // --- cleanup -----------------------------------------------------------------
  console.log("cleanup");
  await base.productType.deleteMany({ where: { key: { in: ["test-type", "test-type-anon"] } } });
  await base.pageView.deleteMany({ where: { path: "/__audit-test__" } });
  await base.auditLog.deleteMany({ where: { entityType: "ProductType", entityId: { in: testIds } } });
  await base.auditLog.deleteMany({ where: { entityType: "ProductType", entityId: null } });
  const leftover = await base.productType.count({ where: { key: { startsWith: "test-type" } } });
  console.log(`  cleanup done (leftover test product_types: ${leftover})`);

  console.log(failures === 0 ? "\nALL CHECKS PASSED ✅" : `\n${failures} CHECK(S) FAILED ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => base.$disconnect());
