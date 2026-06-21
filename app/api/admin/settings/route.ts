import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/site-settings";

const ALLOWED_KEYS = new Set(Object.values(SETTING_KEYS));

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { settings } = await req.json().catch(() => ({}));
  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const ops = Object.entries(settings as Record<string, string>)
    .filter(([key]) => ALLOWED_KEYS.has(key))
    .map(([key, value]) =>
      db.siteSetting.upsert({
        where: { key },
        update: { value: String(value).trim() },
        create: { key, value: String(value).trim() },
      }),
    );

  await db.$transaction(ops);

  return NextResponse.json({ ok: true });
}
