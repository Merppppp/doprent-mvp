import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { advanceDailyLifecycle } from "@/lib/booking-expiry";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/daily-lifecycle
 *
 * Job 2 — runs once daily at 00:05 Bangkok time.
 *   - `confirmed` → `renting` (rental start date arrived)
 *   - `renting` → `awaiting_return` (rental end date arrived)
 *   - `returned` → `completed` (7-day settlement window elapsed)
 *
 * Access: Dkron (internal Docker DNS) + CRON_SECRET header.
 * Public access blocked by Traefik ip-allowlist-infra middleware.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const result = await advanceDailyLifecycle();
  return NextResponse.json({ ok: true, ...result });
}
