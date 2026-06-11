import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
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

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dress = await db.dress.findUnique({
    where: { id: dressId },
    include: { boutique: { select: { ownerId: true } } },
  });
  if (!dress || dress.boutique.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blackouts = await getBlackoutsByMonth([dressId], month);
  return NextResponse.json({ blackouts: blackouts.map((r) => r.date), month });
}
