import { PrismaClient, Prisma } from "@prisma/client";
import { dbContext } from "./db-context";

/**
 * Models that are NEVER audited (no audit_logs row, no before-image read):
 * - AuditLog       — would recurse / audit the audit
 * - PageView       — high-volume analytics noise
 * - LineClick      — high-volume analytics noise
 * - Session        — NextAuth adapter table (token-leak hazard in jsonb)
 * - Account        — NextAuth adapter table (OAuth tokens — secret-leak hazard)
 * - VerificationToken — NextAuth adapter table (token-leak hazard)
 *
 * NOTE: PageView / LineClick still receive createdBy/updatedBy injection —
 * they have the columns; they are only excluded from audit rows.
 */
const AUDIT_EXCLUDED = new Set([
  "AuditLog",
  "PageView",
  "LineClick",
  "Session",
  "Account",
  "VerificationToken",
]);

/**
 * Which audit columns each model actually has, derived from the DMMF so the
 * injection can never set a field that does not exist on the model
 * (e.g. AuditLog has neither createdBy nor updatedBy).
 */
// LAZY: must NOT run at module top-level. middleware.ts (edge runtime) imports
// @/auth → lib/db, where @prisma/client resolves to the browser stub whose
// `Prisma.dmmf` is undefined — a top-level loop crashes EVERY request with 500.
// The stub import itself is harmless as long as nothing executes at import time
// (JWT-strategy middleware never touches the DB).
let MODEL_AUDIT_FIELDS: Record<string, { createdBy: boolean; updatedBy: boolean }> | null = null;
function getModelAuditFields() {
  if (!MODEL_AUDIT_FIELDS) {
    MODEL_AUDIT_FIELDS = {};
    for (const m of Prisma.dmmf.datamodel.models) {
      MODEL_AUDIT_FIELDS[m.name] = {
        createdBy: m.fields.some((f) => f.name === "createdBy"),
        updatedBy: m.fields.some((f) => f.name === "updatedBy"),
      };
    }
  }
  return MODEL_AUDIT_FIELDS;
}

/** Stamp createdBy/updatedBy onto a data object, guarded per model. */
function stampActor(
  model: string,
  data: Record<string, unknown>,
  actorId: string | undefined,
  opts: { created: boolean; updated: boolean },
): Record<string, unknown> {
  const fields = getModelAuditFields()[model];
  const out = { ...data };
  if (opts.created && fields?.createdBy && out.createdBy === undefined) out.createdBy = actorId;
  if (opts.updated && fields?.updatedBy && out.updatedBy === undefined) out.updatedBy = actorId;
  return out;
}

const uncap = (s: string) => s[0].toLowerCase() + s.slice(1);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Un-extended base client. Use for:
 * - PrismaAdapter(base) in auth.ts (Phase 4) — adapter ops must NOT be audited
 * - audit writes themselves (no recursion)
 * - business audit rows (logAdminAction)
 */
export const base =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasourceUrl: appendConnectionLimit(process.env.DATABASE_URL ?? ""),
  });

function appendConnectionLimit(url: string): string {
  if (!url || url.includes("connection_limit")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=5`;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = base;

async function writeAudit(
  model: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  entityId: string | null | undefined,
  actorId: string | undefined,
  before: unknown,
  after: unknown,
) {
  if (AUDIT_EXCLUDED.has(model)) return;
  try {
    await base.auditLog.create({
      data: {
        action,
        entityType: model,
        entityId: entityId ?? null,
        actorId: actorId ?? null,
        before: before == null ? Prisma.JsonNull : (before as Prisma.InputJsonValue),
        after: after == null ? Prisma.JsonNull : (after as Prisma.InputJsonValue),
      },
    });
  } catch (e) {
    // Audit must NEVER break the mutation.
    console.error("[audit] write failed", model, action, e);
  }
}

/** Before-image read for singular ops. Returns null for excluded models. */
async function readBefore(model: string, where: unknown): Promise<unknown> {
  if (AUDIT_EXCLUDED.has(model)) return null;
  try {
    return await (base as any)[uncap(model)].findUnique({ where });
  } catch (e) {
    console.error("[audit] before-image read failed", model, e);
    return null;
  }
}

/**
 * Extended client: injects createdBy/updatedBy from the AsyncLocalStorage
 * actor context (lib/db-context.ts) and writes audit_logs rows for every
 * mutation on non-excluded models.
 *
 * Known trade-offs (per product/db-restructure/DESIGN.md §7):
 * - Audit write is non-transactional with the mutation.
 * - Bulk ops (createMany/updateMany/deleteMany) write ONE audit row with
 *   entityId = null and the filter/payload in `after` — no before-images
 *   (fetching them would turn bulk ops into N+1).
 * - $queryRaw / $executeRaw bypass the extension entirely.
 */
function createExtendedDb() {
  return base.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const actorId = dbContext.getStore()?.actorId;
        (args as any).data = stampActor(model, (args as any).data ?? {}, actorId, {
          created: true,
          updated: true,
        });
        const result = await query(args);
        await writeAudit(model, "CREATE", (result as any)?.id, actorId, null, result);
        return result;
      },

      async update({ model, args, query }) {
        const actorId = dbContext.getStore()?.actorId;
        (args as any).data = stampActor(model, (args as any).data ?? {}, actorId, {
          created: false,
          updated: true,
        });
        const before = await readBefore(model, (args as any).where);
        const result = await query(args);
        await writeAudit(model, "UPDATE", (result as any)?.id, actorId, before, result);
        return result;
      },

      async delete({ model, args, query }) {
        const actorId = dbContext.getStore()?.actorId;
        const before = await readBefore(model, (args as any).where);
        const result = await query(args);
        await writeAudit(
          model,
          "DELETE",
          (before as any)?.id ?? (result as any)?.id,
          actorId,
          before,
          null,
        );
        return result;
      },

      async upsert({ model, args, query }) {
        const actorId = dbContext.getStore()?.actorId;
        (args as any).create = stampActor(model, (args as any).create ?? {}, actorId, {
          created: true,
          updated: true,
        });
        (args as any).update = stampActor(model, (args as any).update ?? {}, actorId, {
          created: false,
          updated: true,
        });
        // Existence check decides whether this is audited as CREATE or UPDATE.
        const before = await readBefore(model, (args as any).where);
        const result = await query(args);
        if (before) {
          await writeAudit(model, "UPDATE", (result as any)?.id, actorId, before, result);
        } else {
          await writeAudit(model, "CREATE", (result as any)?.id, actorId, null, result);
        }
        return result;
      },

      async createMany({ model, args, query }) {
        const actorId = dbContext.getStore()?.actorId;
        const data = (args as any).data;
        (args as any).data = Array.isArray(data)
          ? data.map((d: Record<string, unknown>) =>
              stampActor(model, d, actorId, { created: true, updated: true }),
            )
          : stampActor(model, data ?? {}, actorId, { created: true, updated: true });
        const result = await query(args);
        // ONE audit row, entityId null, payload in `after` (documented trade-off).
        await writeAudit(model, "CREATE", null, actorId, null, {
          bulk: "createMany",
          count: (result as any)?.count,
          data: (args as any).data,
        });
        return result;
      },

      async updateMany({ model, args, query }) {
        const actorId = dbContext.getStore()?.actorId;
        (args as any).data = stampActor(model, (args as any).data ?? {}, actorId, {
          created: false,
          updated: true,
        });
        const result = await query(args);
        // ONE audit row, entityId null, filter + payload in `after` — no
        // before-images (would be N+1). Documented trade-off.
        await writeAudit(model, "UPDATE", null, actorId, null, {
          bulk: "updateMany",
          count: (result as any)?.count,
          where: (args as any).where ?? null,
          data: (args as any).data,
        });
        return result;
      },

      async deleteMany({ model, args, query }) {
        const actorId = dbContext.getStore()?.actorId;
        const result = await query(args);
        // ONE audit row, entityId null, filter in `after` — no before-images.
        await writeAudit(model, "DELETE", null, actorId, null, {
          bulk: "deleteMany",
          count: (result as any)?.count,
          where: (args as any)?.where ?? null,
        });
        return result;
      },
    },
    },
  });
}

type ExtendedDb = ReturnType<typeof createExtendedDb>;
let _db: ExtendedDb | null = null;

/**
 * LAZY proxy: `base.$extends(...)` must not run at module import time —
 * middleware.ts (edge runtime) imports @/auth → lib/db, and any property
 * access on the browser-stub PrismaClient throws ("PrismaClient is not
 * configured to run in Edge Runtime"). The extended client is created on
 * first real use, which only ever happens in the node runtime.
 */
export const db: ExtendedDb = new Proxy({} as ExtendedDb, {
  get(_target, prop) {
    _db ??= createExtendedDb();
    return (_db as any)[prop];
  },
  has(_target, prop) {
    _db ??= createExtendedDb();
    return prop in (_db as any);
  },
});
