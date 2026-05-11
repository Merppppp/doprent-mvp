import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes Supabase session on every request so server components see the
 * latest auth state. See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

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

  // IMPORTANT: getUser() refreshes the access token if expired
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and image optimization endpoints.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
