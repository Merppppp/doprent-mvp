"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Auto-scrolls the product list into view whenever a search / filter is applied.
 *
 * Why: the home page leads with a large banner carousel + occasions row, so
 * after a search the actual products sit below the fold and the user has to
 * scroll down every time ("พอ search ปุ๊บ banner ใหญ่ มองไม่เห็น product").
 *
 * Behaviour: when the URL has any search/filter params, bring the element with
 * id="results" to the top of the #main scroll container. With no params (plain
 * homepage visit) it does nothing, so the hero banner stays visible.
 */
export default function ScrollToResults() {
  const searchParams = useSearchParams();
  const key = searchParams.toString();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // No active search/filter → keep the hero banner in view.
    if (!key) {
      isFirstRender.current = false;
      return;
    }

    // Defer one frame so layout (images/cards) has settled before scrolling.
    const id = window.requestAnimationFrame(() => {
      const el = document.getElementById("results");
      if (!el) return;
      el.scrollIntoView({
        behavior: isFirstRender.current ? "auto" : "smooth",
        block: "start",
      });
      isFirstRender.current = false;
    });

    return () => window.cancelAnimationFrame(id);
  }, [key]);

  return null;
}
