"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  /** Where to send the user after Google OAuth completes. */
  next?: string;
  /** Button copy — "เข้าสู่ระบบด้วย Google" on /login, "สมัครด้วย Google" on /signup. */
  label?: string;
  /** Surface a sign-in error to the parent (so it can show in the form's error slot). */
  onError?: (msg: string) => void;
};

/**
 * Google OAuth sign-in/up button.
 *
 * Same OAuth flow either way — Google authenticates, Supabase auto-creates
 * the auth.users row + triggers handle_new_user which inserts a profile.
 *
 * Requires that Google provider is enabled in Supabase Dashboard:
 *   Authentication → Providers → Google → Enable + paste Client ID + Secret
 *   (See README / setup docs for Google Cloud Console steps.)
 *
 * Without the provider configured, the redirect to Google will fail with
 * "Unsupported provider" — error is surfaced via onError.
 */
export default function GoogleSignInButton({
  next = "/",
  label = "เข้าสู่ระบบด้วย Google",
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const sb = createClient();
    const siteUrl =
      (typeof window !== "undefined" && window.location.origin) ||
      "https://doprent.com";
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      onError?.(error.message);
      setLoading(false);
    }
    // On success, browser navigates to Google's OAuth screen — no further code runs.
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={loading}
      className="btn btn-outline btn-block btn-lg"
      style={{
        opacity: loading ? 0.6 : 1,
        gap: 10,
      }}
    >
      <GoogleLogo />
      {loading ? "กำลังเชื่อมต่อ Google..." : label}
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
