# Phase 3 — Audit extension notes (what Phase 4 must wire)

Phase 3 delivered `lib/db-context.ts` (AsyncLocalStorage actor context) and the
rewritten `lib/db.ts` (un-extended `base` + audited/actor-stamped `db` via
`$extends`). **No app code or `auth.ts` was touched.** Phase 4 must:

1. **`auth.ts`: switch the adapter to the un-extended client** —
   `PrismaAdapter(base)` (import `base` from `@/lib/db`). Do NOT pass the
   extended `db`: adapter ops would be actor-stamped/audited, and serializing
   Account/Session/VerificationToken rows into `audit_logs.before/after` jsonb
   would leak OAuth/verification tokens (DESIGN §8.4). The exclusion set in
   `lib/db.ts` is defense-in-depth only.

2. **Adopt `withActor` in every server action / route handler that mutates**:
   ```ts
   import { withActor } from "@/lib/db-context";
   const session = await auth();
   return withActor(session?.user?.id, async () => {
     await db.product.update({ ... }); // createdBy/updatedBy + audit row get the actor
   });
   ```
   Mutations outside `withActor` still work — `actor_id` / `created_by` /
   `updated_by` are simply NULL (system/anonymous).

3. **`logAdminAction` / business audit rows** must write through `base`
   (`base.auditLog.create`) so they are not re-audited.

4. Remember the trade-offs baked in (DESIGN §7): audit writes are
   non-transactional; bulk ops produce ONE audit row with `entity_id = NULL`
   and filter/payload in `after` (no before-images); `$queryRaw`/`$executeRaw`
   bypass the extension.
