import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { expirePayments, autoConfirmSlips, sendSlipReminders, autoResolveReturnDisputes } from "@/lib/booking-expiry";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/payment-expiry
 *
 * Job 1 — runs every 5 minutes.
 *   - Flips `waiting_for_payment` → `payment_expired` (payment window elapsed)
 *   - Auto-confirms `payment_review` slips past `slipConfirmDueAt`
 *   - Sends slip-review reminders to sellers at halfway point
 *   - Auto-resolves `return_disputed` bookings past 48h (→ returned, renter's favor)
 *
 * Access: Dkron (internal Docker DNS) + CRON_SECRET header.
 * Public access restricted by Traefik ip-allowlist-infra middleware.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const [payments, slips, reminders, returnDisputes] = await Promise.all([
    expirePayments(),
    autoConfirmSlips(),
    sendSlipReminders(),
    autoResolveReturnDisputes(),
  ]);

  return NextResponse.json({
    ok: true,
    ...payments,
    ...slips,
    ...reminders,
    returnDisputesResolved: returnDisputes.resolved,
  });
}
