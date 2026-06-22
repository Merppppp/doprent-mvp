import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/site-settings";

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const ALLOWED_KEYS = new Set<SettingKey>(Object.values(SETTING_KEYS));

function isSettingsPayload(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function isAllowedSettingKey(key: string): key is SettingKey {
  return ALLOWED_KEYS.has(key as SettingKey);
}

function isAllowedSettingEntry(entry: [string, string]): entry is [SettingKey, string] {
  return isAllowedSettingKey(entry[0]);
}

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
  if (!isSettingsPayload(settings)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const ops = Object.entries(settings)
    .filter(isAllowedSettingEntry)
    .map(([key, value]) =>
      db.siteSetting.upsert({
        where: { key },
        update: { value: value.trim() },
        create: { key, value: value.trim() },
      }),
    );

  await db.$transaction(ops);

  return NextResponse.json({ ok: true });
}
