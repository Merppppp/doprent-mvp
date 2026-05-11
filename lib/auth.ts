import { createClient } from "./supabase/server";
import type { Profile } from "./types";

const ADMIN_EMAILS = ["admin@doprent.com", "prem@doprent.com", "hgcovuf@gmail.com"];

/** Returns the auth.user + profile for the currently signed-in user, or null.
 *  Auto-creates a profile row if missing (defensive: DB trigger may have failed
 *  silently on first signup). Never throws — auth failures degrade gracefully.
 */
export async function getCurrentUser(): Promise<{ profile: Profile; email: string } | null> {
  try {
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;

    // Try to read profile
    let { data: profile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // If profile missing, create it on demand
    if (!profile) {
      const role = ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())
        ? "admin"
        : "customer";
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.email ?? "").split("@")[0];
      const { data: created } = await sb
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName,
            role,
          },
          { onConflict: "id" },
        )
        .select("*")
        .maybeSingle();
      profile = created;
    }

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
