"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Verify the current user owns the boutique that contains this dress. */
async function verifyDressOwner(dressId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const { data: dress } = await sb
    .from("dresses")
    .select("id, boutiques!inner(owner_id)")
    .eq("id", dressId)
    .maybeSingle();
  const ownerId = (dress as unknown as { boutiques: { owner_id: string } } | null)?.boutiques?.owner_id;
  if (!dress || ownerId !== user.id) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ปฏิทินของชุดนี้" };
  }
  return { ok: true };
}

/**
 * Toggle a single date's blackout state. Date format: YYYY-MM-DD.
 * If currently in blackouts → delete; otherwise → insert.
 */
export async function toggleBlackout(
  dressId: string,
  date: string,
): Promise<{ ok: boolean; blocked: boolean; error?: string }> {
  const owner = await verifyDressOwner(dressId);
  if (!owner.ok) return { ok: false, blocked: false, error: owner.error };

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, blocked: false, error: "รูปแบบวันที่ไม่ถูกต้อง" };
  }

  const sb = createClient();
  // Check current state
  const { data: existing } = await sb
    .from("dress_blackouts")
    .select("dress_id")
    .eq("dress_id", dressId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from("dress_blackouts")
      .delete()
      .eq("dress_id", dressId)
      .eq("date", date);
    if (error) return { ok: false, blocked: true, error: error.message };
    revalidatePath(`/dress/${dressId}`);
    return { ok: true, blocked: false };
  } else {
    const { error } = await sb.from("dress_blackouts").insert({ dress_id: dressId, date });
    if (error) return { ok: false, blocked: false, error: error.message };
    revalidatePath(`/dress/${dressId}`);
    return { ok: true, blocked: true };
  }
}

/**
 * Replace ALL blackouts for a dress with the given list of YYYY-MM-DD dates.
 * Useful for "Save Calendar" pattern (vs per-click toggle). Not used in current UI
 * but kept for future batch-save flow.
 */
export async function setBlackouts(
  dressId: string,
  dates: string[],
): Promise<{ ok: boolean; error?: string }> {
  const owner = await verifyDressOwner(dressId);
  if (!owner.ok) return owner;

  const validDates = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const sb = createClient();

  // Clear existing future blackouts, keep past ones for audit
  const today = new Date().toISOString().slice(0, 10);
  await sb.from("dress_blackouts").delete().eq("dress_id", dressId).gte("date", today);

  if (validDates.length > 0) {
    const rows = validDates.map((d) => ({ dress_id: dressId, date: d }));
    const { error } = await sb.from("dress_blackouts").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/dress/${dressId}`);
  return { ok: true };
}
