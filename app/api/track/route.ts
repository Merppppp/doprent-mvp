import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabase } from "@/lib/supabase";

/** Lightweight LINE click-through tracker.
 *  - No-op when Supabase is not configured (dev without env)
 *  - Hashes IP for privacy (PDPA-friendly)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ ok: true, stored: false });

    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const ipHash = ipRaw
      ? createHash("sha256").update(ipRaw + (process.env.IP_HASH_SALT || "doprent")).digest("hex").slice(0, 16)
      : null;

    await sb.from("line_clicks").insert({
      dress_id: body?.dress_id ?? null,
      boutique_id: body?.boutique_id ?? null,
      source: body?.source ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? null,
      ip_hash: ipHash,
    });
    return NextResponse.json({ ok: true, stored: true });
  } catch (err) {
    console.error("[doprent] /api/track error", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
