"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Toggle a dress ID in the current user's saved list. Idempotent. */
export async function toggleSavedDress(dressId: string): Promise<{
  ok: boolean;
  saved: boolean;
  redirectTo?: string;
}> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { ok: false, saved: false, redirectTo: "/login?next=/browse" };
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("saved_dress_ids")
    .eq("id", user.id)
    .maybeSingle();

  const current: string[] = profile?.saved_dress_ids ?? [];
  const exists = current.includes(dressId);
  const next = exists ? current.filter((id) => id !== dressId) : [...current, dressId];

  const { error } = await sb
    .from("profiles")
    .update({ saved_dress_ids: next, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { ok: false, saved: exists };
  }

  // Refresh server components that show saved state
  revalidatePath("/account");
  return { ok: true, saved: !exists };
}
