import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Returns the auth.user + profile for the currently signed-in user, or null.
 *  Never throws — auth failures degrade gracefully to "logged out" UI.
 */
export async function getCurrentUser(): Promise<{ profile: Profile; email: string } | null> {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;

    const { data: profile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return null;
    return { profile: profile as Profile, email: user.email ?? "" };
  } catch (err) {
    console.error("[doprent] getCurrentUser error", err);
    return null;
  }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const u = await getCurrentUser();
  return u?.profile.role === "admin";
}
