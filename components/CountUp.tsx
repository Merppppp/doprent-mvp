"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  prefix?: string;
  durationMs?: number;
};

/**
 * Animated count-up that owns its own text node (runs in useEffect, after
 * hydration) so React never resets it back to the server-rendered value.
 * Renders the final number immediately when JS is off or motion is reduced,
 * so the stat is ALWAYS visible — the old inline-script version stuck at 0.
 */
export default function CountUp({ value, prefix = "", durationMs = 1200 }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // Start already showing the real value as a safe fallback.
  const [display, setDisplay] = useState<string>(
    prefix + value.toLocaleString("en-US")
  );
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setDisplay(prefix + value.toLocaleString("en-US"));
      return;
    }

    const run = () => {
      if (done.current) return;
      done.current = true;
      let t0: number | null = null;
      const step = (ts: number) => {
        if (t0 === null) t0 = ts;
        const p = Math.min((ts - t0) / durationMs, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(prefix + Math.round(value * eased).toLocaleString("en-US"));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              run();
              io.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      io.observe(el);
      return () => io.disconnect();
    }

    run();
  }, [value, prefix, durationMs]);

  return <span ref={ref}>{display}</span>;
}
