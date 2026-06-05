"use client";

import { useEffect, useState } from "react";

/**
 * Two themed sliders (ต่ำสุด / สูงสุด) for a price band. Live ฿ readout while
 * dragging; commits (so the parent can navigate) only on release. Clamps so
 * low never exceeds high.
 */
export default function PriceRange({
  min,
  max,
  step = 100,
  lo,
  hi,
  onCommit,
}: {
  min: number;
  max: number;
  step?: number;
  lo: number;
  hi: number;
  onCommit: (lo: number, hi: number) => void;
}) {
  const [a, setA] = useState(lo);
  const [b, setB] = useState(hi);

  useEffect(() => setA(lo), [lo]);
  useEffect(() => setB(hi), [hi]);

  const commit = () => onCommit(a, b);
  const fmt = (n: number) => `฿${n.toLocaleString()}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{fmt(a)}</span>
        <span style={{ color: "var(--ink-3)" }}>ถึง</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>
          {b >= max ? `${fmt(max)}+` : fmt(b)}
        </span>
      </div>

      <label style={{ display: "block", fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>ต่ำสุด</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={a}
        onChange={(e) => setA(Math.min(Number(e.target.value), b))}
        onMouseUp={commit}
        onTouchEnd={commit}
        aria-label="ราคาต่ำสุด"
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />

      <label style={{ display: "block", fontSize: 11, color: "var(--ink-3)", margin: "8px 0 2px" }}>สูงสุด</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={b}
        onChange={(e) => setB(Math.max(Number(e.target.value), a))}
        onMouseUp={commit}
        onTouchEnd={commit}
        aria-label="ราคาสูงสุด"
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />
    </div>
  );
}
