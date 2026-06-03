"use client";

import { useEffect } from "react";

/**
 * Progressive scroll-reveal. Mounts once in the root layout.
 *
 * Strategy: the reveal styles in globals.css only apply when <body> has the
 * `js-reveal` class. We add that class on mount, so any user without JS (or
 * with prefers-reduced-motion) sees fully-visible content — the animation is
 * purely additive and can never trap content in a hidden state.
 *
 * Elements opt in with `.reveal` (single) or `.reveal-stagger` (animates its
 * direct children in sequence). An IntersectionObserver flips them to `.is-in`
 * the first time they enter the viewport, then stops observing them.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return;

    document.body.classList.add("js-reveal");

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal, .reveal-stagger")
    );
    if (targets.length === 0) return;

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
    return () => io.disconnect();
  }, []);

  return null;
}
