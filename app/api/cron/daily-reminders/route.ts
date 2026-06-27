import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendReturnReminders } from "@/lib/booking-expiry";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/daily-reminders
 *
 * Job 3 — runs once daily at 08:00 Bangkok time.
 *   - Return-due reminder: rental end date arrived, renter hasn't shipped
 *   - Overdue reminder: past end date + return window, still not returned
 *
 * Neither triggers auto-transition — only the seller confirms physical return.
 *
 * Access: Dkron (internal Docker DNS) + CRON_SECRET header.
 * Public access blocked by Traefik ip-allowlist-infra middleware.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const result = await sendReturnReminders();
  return NextResponse.json({ ok: true, ...result });
}
