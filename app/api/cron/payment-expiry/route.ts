import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { expirePayments } from "@/lib/booking-expiry";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/payment-expiry
 *
 * Job 1 — runs every 5 minutes.
 * Flips `waiting_for_payment` → `payment_expired` when the 3-hour payment
 * window has elapsed, releasing the reserved unit back to stock.
 *
 * Access: Dkron (internal Docker DNS) + CRON_SECRET header.
 * Public access blocked by Traefik ip-allowlist-infra middleware.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const result = await expirePayments();
  return NextResponse.json({ ok: true, ...result });
}
