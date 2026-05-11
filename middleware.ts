import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes Supabase session on every page request. Uses the modern
 * getAll/setAll cookie API from @supabase/ssr >= 0.5. Wrapped in try/catch so
 * a transient Supabase error never takes the whole site down.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return res;

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    });

    // IMPORTANT: getUser() refreshes the access token if expired
    await supabase.auth.getUser();
  } catch (err) {
    console.error("[doprent] middleware error", err);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
