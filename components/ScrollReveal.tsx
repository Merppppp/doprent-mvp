"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return;

    document.body.classList.add("js-reveal");

    const observe = () => {
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".reveal:not(.is-in), .reveal-stagger:not(.is-in)"
        )
      );
      if (targets.length === 0) return null;

      const io = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              obs.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );

      targets.forEach((el) => io.observe(el));
      return io;
    };

    // Small delay so the new page DOM is ready after route change.
    const timer = setTimeout(() => {
      const io = observe();
      if (io) cleanupRef = () => io.disconnect();
    }, 50);

    let cleanupRef: (() => void) | undefined;
    return () => {
      clearTimeout(timer);
      cleanupRef?.();
    };
  }, [pathname]);

  return null;
}
