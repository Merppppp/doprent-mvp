import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBlackoutsByMonth } from "@/lib/dresses";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dressId = url.searchParams.get("dress_id");
  const month = url.searchParams.get("month");

  if (!dressId || !month) {
    return NextResponse.json({ error: "dress_id and month are required" }, { status: 400 });
  }
  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
  }

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: dress } = await sb
    .from("dresses")
    .select("id, boutiques!inner(owner_id)")
    .eq("id", dressId)
    .maybeSingle();

  const ownerId = (dress as unknown as { boutiques: { owner_id: string } } | null)?.boutiques?.owner_id;
  if (!dress || ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blackouts = await getBlackoutsByMonth([dressId], month);
  return NextResponse.json({ blackouts: blackouts.map((row) => row.date), month });
}
