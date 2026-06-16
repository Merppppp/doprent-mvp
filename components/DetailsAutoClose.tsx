"use client";

import { useEffect } from "react";

/**
 * Closes any open native <details> matching `selector` when the user clicks
 * outside it or presses Escape.
 *
 * Why: the header category dropdown is a server-rendered native <details>, which
 * only toggles via its <summary>. Users expect it to dismiss on an outside click
 * ("ถ้าเอา mouse ออกจากโซน dropdown และกดบริเวณนอก ควรจะปิดให้ด้วย"). This adds
 * that behaviour without converting the whole dropdown into client state.
 */
export default function DetailsAutoClose({
  selector = "details.hdr-cat-details",
}: {
  selector?: string;
}) {
  useEffect(() => {
    function closeAll(except?: Element | null) {
      document.querySelectorAll<HTMLDetailsElement>(selector).forEach((d) => {
        if (d !== except && d.open) d.open = false;
      });
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Element | null;
      const inside = target?.closest(selector) ?? null;
      // ONLY close on a click that lands OUTSIDE every menu. We must NOT close on
      // a click inside — doing so on pointerdown unmounts the dropdown content
      // before the link's `click` fires, which is exactly why options weren't
      // selectable. Inside clicks are handled by `onClick` below.
      if (!inside) closeAll(null);
    }

    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const inside = target?.closest(selector) ?? null;
      if (!inside) return;
      // A link inside the menu was clicked — let the navigation proceed, then
      // close on the next tick so the menu doesn't linger open after an App
      // Router soft navigation keeps the layout mounted.
      if (target?.closest("a[href]")) {
        setTimeout(() => closeAll(null), 0);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selector]);

  return null;
}
