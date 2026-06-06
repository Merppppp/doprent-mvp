import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  FIRST_TOUCH_COOKIE,
  FIRST_TOUCH_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  buildAttribution,
  encodeAttribution,
} from "@/lib/attribution";

/**
 * NextAuth middleware (keeps the JWT session fresh) wrapped to ALSO capture
 * first-touch attribution + an anonymous session id on the first request of a
 * visit. Cookies are written once and never overwritten, so the original
 * acquisition channel survives the whole acquisition window — this lets us
 * measure where traffic comes from even before the user logs in.
 */
export default auth((req) => {
  const res = NextResponse.next();

  try {
    // Session id — used to count unique anonymous visitors.
    if (!req.cookies.get(SESSION_COOKIE)) {
      res.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
        maxAge: SESSION_MAX_AGE,
        sameSite: "lax",
        path: "/",
      });
    }

    // First-touch — only set if absent (preserve original source).
    if (!req.cookies.get(FIRST_TOUCH_COOKIE)) {
      const sp = req.nextUrl.searchParams;
      const referrer = req.headers.get("referer");
      let sameOrigin = false;
      try {
        sameOrigin = referrer ? new URL(referrer).host === req.nextUrl.host : false;
      } catch {
        sameOrigin = false;
      }
      const attribution = buildAttribution({
        utmSource: sp.get("utm_source") ?? sp.get("ref"),
        utmMedium: sp.get("utm_medium"),
        utmCampaign: sp.get("utm_campaign"),
        referrer: sameOrigin ? null : referrer, // ignore internal navigation
      });
      res.cookies.set(FIRST_TOUCH_COOKIE, encodeAttribution(attribution), {
        maxAge: FIRST_TOUCH_MAX_AGE,
        sameSite: "lax",
        path: "/",
      });
    }
  } catch (err) {
    console.error("[doprent] attribution capture error", err);
  }

  return res;
});

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
