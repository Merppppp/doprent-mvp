import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  FIRST_TOUCH_COOKIE,
  FIRST_TOUCH_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  buildAttribution,
  encodeAttribution,
} from "@/lib/attribution";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Computes the FIRST-touch attribution + session cookies to set on this
 * request, so we can measure where traffic comes from even before the user
 * logs in (line_clicks only fires for authed users). Returns only the cookies
 * that are MISSING — first-touch is written once and never overwritten, so the
 * original acquisition channel is preserved across the whole acquisition window.
 */
function attributionCookies(req: NextRequest): CookieToSet[] {
  const out: CookieToSet[] = [];

  // Session id — used to count unique anonymous visitors.
  if (!req.cookies.get(SESSION_COOKIE)) {
    out.push({
      name: SESSION_COOKIE,
      value: crypto.randomUUID(),
      options: { maxAge: SESSION_MAX_AGE, sameSite: "lax", path: "/" },
    });
  }

  // First-touch — only set if not already present (preserve original source).
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
      // ignore internal navigation as the "referrer" for first-touch
      referrer: sameOrigin ? null : referrer,
    });
    out.push({
      name: FIRST_TOUCH_COOKIE,
      value: encodeAttribution(attribution),
      options: { maxAge: FIRST_TOUCH_MAX_AGE, sameSite: "lax", path: "/" },
    });
  }

  return out;
}

/**
 * Refreshes Supabase session on every page request. Uses the modern
 * getAll/setAll cookie API from @supabase/ssr >= 0.5. Wrapped in try/catch so
 * a transient Supabase error never takes the whole site down.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  // Compute attribution cookies up front; applied at the very end so they
  // survive the res reassignment that Supabase's setAll may perform.
  let attrCookies: CookieToSet[] = [];
  try {
    attrCookies = attributionCookies(req);
  } catch (err) {
    console.error("[doprent] attribution capture error", err);
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      attrCookies.forEach((c) => res.cookies.set(c.name, c.value, c.options));
      return res;
    }

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    });

    // Refresh access token if expired
    await supabase.auth.getUser();
  } catch (err) {
    console.error("[doprent] middleware error", err);
  }

  // Apply attribution cookies to the FINAL res (after Supabase may have
  // recreated it in setAll), so they are never dropped.
  attrCookies.forEach((c) => res.cookies.set(c.name, c.value, c.options));

  return res;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
