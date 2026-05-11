import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/signout — clears session cookie and redirects home. */
export async function POST(req: Request) {
  const sb = createClient();
  await sb.auth.signOut();
  const url = new URL("/", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
