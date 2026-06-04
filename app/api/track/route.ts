import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import {
  FIRST_TOUCH_COOKIE,
  SESSION_COOKIE,
  decodeAttribution,
} from "@/lib/attribution";

/** Lightweight client telemetry sink.
 *  - event "line_click": LINE CTA click-through (authed users only)
 *  - event "pageview":   general visitor analytics (anon + authed)
 *  No-op when Supabase is not configured (dev without env).
 *  Hashes IP for privacy (PDPA-friendly).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ ok: true, stored: false });

    const h = headers();
    const ck = cookies();

    // --- privacy-preserving IP hash ---
    const ipRaw =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "";
    const ipHash = ipRaw
      ? createHash("sha256")
          .update(ipRaw + (process.env.IP_HASH_SALT || "doprent"))
          .digest("hex")
          .slice(0, 16)
      : null;

    // --- attribution (first-touch cookie) + session id ---
    const firstTouch = decodeAttribution(ck.get(FIRST_TOUCH_COOKIE)?.value);
    const sessionId = ck.get(SESSION_COOKIE)?.value ?? null;
    const channel = firstTouch?.channel ?? null;

    // --- approximate geo from the edge (Vercel / Cloudflare headers) ---
    const province =
      h.get("x-vercel-ip-city") ||
      h.get("x-vercel-ip-country-region") ||
      h.get("cf-region") ||
      null;
    const country = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || null;
    const userAgent = h.get("user-agent") ?? null;

    const event = body?.event === "pageview" ? "pageview" : "line_click";

    if (event === "pageview") {
      // Identify the user (if logged in) so we can also track recency/MAU.
      let userId: string | null = null;
      try {
        const authed = createClient();
        const {
          data: { user },
        } = await authed.auth.getUser();
        userId = user?.id ?? null;

        if (userId) {
          // Recency for MAU — always updated.
          await authed
            .from("profiles")
            .update({
              last_active_at: new Date().toISOString(),
              last_province: province,
            })
            .eq("id", userId);

          // Backfill signup attribution for OAuth users whose channel wasn't
          // captured at signup (best-effort, only when not yet set).
          if (firstTouch) {
            await authed
              .from("profiles")
              .update({
                signup_source: firstTouch.source,
                signup_medium: firstTouch.medium,
                signup_campaign: firstTouch.campaign,
                signup_referrer: firstTouch.referrer,
                signup_channel: firstTouch.channel,
              })
              .eq("id", userId)
              .is("signup_channel", null);
          }
        }
      } catch {
        /* anon or auth unavailable — still record the pageview */
      }

      await sb.from("page_views").insert({
        session_id: sessionId,
        user_id: userId,
        path: typeof body?.path === "string" ? body.path.slice(0, 512) : null,
        channel,
        utm_source: firstTouch?.source ?? null,
        utm_medium: firstTouch?.medium ?? null,
        utm_campaign: firstTouch?.campaign ?? null,
        referrer: firstTouch?.referrer ?? null,
        province,
        country,
        user_agent: userAgent,
        ip_hash: ipHash,
      });
      return NextResponse.json({ ok: true, stored: true, event });
    }

    // --- line_click (existing behavior, now attribution-enriched) ---
    await sb.from("line_clicks").insert({
      dress_id: body?.dress_id ?? null,
      boutique_id: body?.boutique_id ?? null,
      source: body?.source ?? "unknown",
      channel,
      utm_source: firstTouch?.source ?? null,
      referrer: firstTouch?.referrer ?? null,
      province,
      session_id: sessionId,
      user_agent: userAgent,
      ip_hash: ipHash,
    });
    return NextResponse.json({ ok: true, stored: true, event });
  } catch (err) {
    console.error("[doprent] /api/track error", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
