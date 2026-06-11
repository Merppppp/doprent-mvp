import { NextRequest, NextResponse } from "next/server";
import { expireOverdueBookings } from "@/lib/booking-expiry";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/expire-payments
 * Sweeps overdue `waiting_for_payment` bookings to `payment_expired`.
 * Protected by CRON_SECRET (Authorization: Bearer <secret> or ?secret=).
 * Intended for an external scheduler (Vercel Cron / system crontab); the same
 * sweep also runs lazily on the booking list pages, so this is a safety net.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed: without a configured secret the endpoint is disabled.
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  const provided =
    auth?.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireOverdueBookings();
  return NextResponse.json({ ok: true, expired });
}
