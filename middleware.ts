import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes Supabase session on every page request. Wrapped in try/catch so a
 * Supabase outage or transient error never takes the whole site down.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return res;

    const supabase = createServerClient(url, anon, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: "", ...options });
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value: "", ...options });
        },
      },
    });

    await supabase.auth.getUser();
  } catch (err) {
    // Don't block the request if session refresh fails.
    console.error("[doprent] middleware error", err);
  }

  return res;
}

export const config = {
  matcher: [
    // Run only on page navigations; skip API routes, static assets, OG images
    "/((?!api/|_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
