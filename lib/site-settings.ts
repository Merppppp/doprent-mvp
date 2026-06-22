import { cache } from "react";
import { db } from "@/lib/db";

export const SETTING_KEYS = {
  LINE_URL: "line_url",
  CONTACT_EMAIL: "contact_email",
  LINE_DISPLAY: "line_display",
} as const;

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.LINE_URL]: "https://line.me/R/ti/p/@doprent",
  [SETTING_KEYS.CONTACT_EMAIL]: "hello@doprent.com",
  [SETTING_KEYS.LINE_DISPLAY]: "@doprent",
};

export const getSiteSettings = cache(async () => {
  const rows = await db.siteSetting.findMany();
  const map: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
});

export async function getSetting(key: string): Promise<string> {
  const all = await getSiteSettings();
  return all[key] ?? "";
}
