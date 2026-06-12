import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request actor context for the audit extension in `lib/db.ts`.
 * Server actions / route handlers opt in via `withActor`; everything else
 * (NextAuth adapter, cron, anonymous reads) runs with actorId = undefined.
 */
export const dbContext = new AsyncLocalStorage<{ actorId?: string }>();

/**
 * Wrap any server action / route body: withActor(session.user.id, () => ...)
 *
 * NOTE: fn is awaited INSIDE the ALS context. Prisma queries are lazy
 * (PrismaPromise executes on .then), so `dbContext.run({ actorId }, fn)`
 * alone would lose the context for `withActor(id, () => db.x.create(...))` —
 * the query would only execute after run() already returned.
 */
export const withActor = <T>(actorId: string | undefined, fn: () => Promise<T>) =>
  dbContext.run({ actorId }, async () => await fn());
