import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { expireOverdueBookings } from "@/lib/booking-expiry";
import { sendReturnReminders } from "@/lib/booking-expiry";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/expire-payments
 *
 * LEGACY combined endpoint — runs ALL auto-transitions + reminders in one
 * shot. Kept for backward compatibility with lazy page-load sweeps.
 *
 * For scheduled cron, use the split endpoints instead:
 *   - /api/cron/payment-expiry   (every 5 min)
 *   - /api/cron/daily-lifecycle  (daily 00:05)
 *   - /api/cron/daily-reminders  (daily 08:00)
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const expired = await expireOverdueBookings();
  const reminders = await sendReturnReminders();
  return NextResponse.json({ ok: true, expired, reminders });
}
