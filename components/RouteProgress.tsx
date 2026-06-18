"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Dependency-free top loading bar for App Router navigation.
 *
 * Why: server-component navigation between pages has no built-in spinner, so the
 * UI feels frozen ("นิ่งมาก") while the next page is being fetched. This shows an
 * animated bar across the top the moment a navigation starts and completes it
 * when the route actually changes.
 *
 * How it works:
 *  - START: capture-phase click on internal <a>/<Link>, programmatic
 *    history.pushState/replaceState (covers router.push), and popstate (back/fwd).
 *  - DONE:  when pathname or searchParams change (navigation committed), or after
 *    a safety timeout so the bar never gets stuck.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  function clearTimers() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  }

  function start() {
    if (activeRef.current) return;
    activeRef.current = true;
    setVisible(true);
    setProgress(8);
    clearTimers();
    // Trickle towards ~90% — never reach 100 until navigation completes.
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = p < 50 ? 8 : p < 75 ? 4 : 1.5;
        return Math.min(90, p + step);
      });
    }, 220);
    // Safety: if no route change fires (same-page / aborted), auto-finish.
    safetyRef.current = setTimeout(() => done(), 8000);
  }

  function done() {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  }

  // Complete the bar whenever the committed route changes.
  useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Wire up navigation start signals once.
  useEffect(() => {
    function sameDestination(url: URL): boolean {
      return url.pathname === window.location.pathname && url.search === window.location.search;
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // external
      if (sameDestination(url)) return; // no navigation
      start();
    }

    // Patch history so programmatic router.push/replace also triggers the bar.
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      start();
      return origPush.apply(this, args as Parameters<typeof origPush>);
    };
    history.replaceState = function (...args) {
      return origReplace.apply(this, args as Parameters<typeof origReplace>);
    };

    function onPopState() {
      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      history.pushState = origPush;
      history.replaceState = origReplace;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--accent, #2e9c65)",
          boxShadow: "0 0 8px var(--accent, #2e9c65)",
          borderRadius: "0 2px 2px 0",
          transition: "width 0.22s ease",
        }}
      />
    </div>
  );
}
