import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
import {
  FIRST_TOUCH_COOKIE,
  SESSION_COOKIE,
  decodeAttribution,
} from "@/lib/attribution";

/** Lightweight client telemetry sink (Postgres/Prisma).
 *  - event "line_click": LINE CTA click-through
 *  - event "pageview":   general visitor analytics (anon + authed)
 *  Hashes IP for privacy (PDPA-friendly).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const h = headers();
    const ck = cookies();

    // --- privacy-preserving IP hash ---
    const ipRaw =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
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

    // --- approximate geo from upstream headers ---
    // Set by nginx (GeoIP2 module → X-Geo-Region/X-Geo-Country) on our VPS,
    // or Cloudflare (cf-*) if proxied through it. Null if none are present.
    const province =
      h.get("x-geo-region") || h.get("x-geo-city") || h.get("cf-region") || null;
    const country = h.get("x-geo-country") || h.get("cf-ipcountry") || null;
    const userAgent = h.get("user-agent") ?? null;

    const event = body?.event === "pageview" ? "pageview" : "line_click";

    if (event === "pageview") {
      // Identify the user (if logged in) for recency/MAU + attribution backfill.
      let userId: string | null = null;
      try {
        const session = await auth();
        userId = session?.user?.id ?? null;
        if (userId) {
          const exists = await db.user.findUnique({
            where: { id: userId },
            select: { id: true },
          });
          if (!exists) {
            userId = null;
          } else {
            await db.user.update({
              where: { id: userId },
              data: { lastActiveAt: new Date(), lastProvince: province },
            });
            if (firstTouch) {
              await db.user.updateMany({
                where: { id: userId, signupChannel: null },
                data: {
                  signupSource: firstTouch.source,
                  signupMedium: firstTouch.medium,
                  signupCampaign: firstTouch.campaign,
                  signupReferrer: firstTouch.referrer,
                  signupChannel: firstTouch.channel,
                },
              });
            }
          }
        }
      } catch {
        userId = null;
      }

      await db.pageView.create({
        data: {
          sessionId,
          userId,
          path: typeof body?.path === "string" ? body.path.slice(0, 512) : null,
          channel,
          utmSource: firstTouch?.source ?? null,
          utmMedium: firstTouch?.medium ?? null,
          utmCampaign: firstTouch?.campaign ?? null,
          referrer: firstTouch?.referrer ?? null,
          province,
          country,
          userAgent,
          ipHash,
        },
      });
      return NextResponse.json({ ok: true, stored: true, event });
    }

    // --- line_click (attribution-enriched) ---
    let userId: string | null = null;
    try {
      const session = await auth();
      userId = session?.user?.id ?? null;
    } catch {
      /* anon */
    }
    await db.lineClick.create({
      data: {
        dressId: body?.dress_id ?? null,
        boutiqueId: body?.boutique_id ?? null,
        source: body?.source ?? "unknown",
        userId,
        channel,
        utmSource: firstTouch?.source ?? null,
        referrer: firstTouch?.referrer ?? null,
        province,
        sessionId,
        userAgent,
        ipHash,
      },
    });
    return NextResponse.json({ ok: true, stored: true, event });
  } catch (err) {
    console.error("[doprent] /api/track error", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
