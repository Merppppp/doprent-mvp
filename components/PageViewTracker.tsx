"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fires a lightweight "pageview" beacon on every route change so we can
 * measure top-of-funnel traffic (visitors/day-hour, channel, geo) — not just
 * LINE clicks, which only fire for logged-in users.
 *
 * Uses sendBeacon (fire-and-forget, survives navigation). The server reads the
 * first-touch + session cookies, so no PII is sent from the client.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    try {
      const payload = JSON.stringify({ event: "pageview", path: pathname });
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" }),
        );
      }
    } catch {
      /* noop — telemetry must never break navigation */
    }
  }, [pathname]);

  return null;
}
