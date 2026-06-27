import { NextRequest, NextResponse } from "next/server";

/**
 * Validate cron request authentication.
 *
 * Cron endpoints are internal-only (Dkron calls via Docker overlay DNS,
 * bypassing Traefik). CRON_SECRET is a defence-in-depth layer — Traefik
 * also blocks `/api/cron/*` from public access via `cron-internal-only`
 * ipWhiteList middleware.
 *
 * @returns null if authenticated, NextResponse error otherwise
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  const provided = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
