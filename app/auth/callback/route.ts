import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * GET /auth/callback
 *
 * Handles two distinct auth flows:
 *
 * 1) Email confirmation (signup, password reset, email change, magic link).
 *    Supabase sends users an email with a link to:
 *      {SITE}/auth/callback?token_hash=...&type=signup&next=/account
 *    We exchange the token for a session via verifyOtp({ token_hash, type })
 *    which sets the session cookies, then redirect to `next`.
 *
 * 2) OAuth callback (Google, etc.).
 *    Provider redirects to:
 *      {SITE}/auth/callback?code=...&next=/
 *    We exchange the code for a session via exchangeCodeForSession(code).
 *
 * If neither token_hash nor code is present, redirect to /login with an
 * error param so the user sees a clear message instead of silently failing.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") || "/account";

  const sb = createClient();

  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(
      new URL(`/login?err=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return NextResponse.redirect(
      new URL(`/login?err=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(
    new URL("/login?err=missing_auth_params", url.origin),
  );
}
