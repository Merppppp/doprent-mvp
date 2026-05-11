import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client (anon key, public reads).
 * Auth/session handling is added in Phase B.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export const isSupabaseConfigured = Boolean(url && anonKey);

export const DEFAULT_LINE_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ||
  "https://line.me/R/ti/p/@doprent";
