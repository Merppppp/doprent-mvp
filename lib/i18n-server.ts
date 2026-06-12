// ── i18n-server — server-only locale helper ───────────────────────────────────
// Import this ONLY in Server Components, Route Handlers, or Server Actions.
// Never import in 'use client' files — it will break the bundle.

import { cookies } from "next/headers";
import type { Locale } from "./i18n";

export function getServerLocale(): Locale {
  const val = cookies().get("NEXT_LOCALE")?.value;
  return val === "en" ? "en" : "th";
}
