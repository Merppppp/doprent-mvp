"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to a waiting_for_payment booking's `currentDueAt` deadline.
 * Renter-facing: shows how long is left to upload the payment slip before the
 * booking auto-expires (see lib/booking-expiry.ts + PAYMENT_WINDOW_HOURS).
 *
 * Time is computed only after mount (useEffect) to avoid SSR/client hydration
 * drift — the server clock and the viewer's clock differ by a few seconds.
 */
export default function PaymentCountdown({
  dueAt,
  variant = "card",
}: {
  dueAt: string;
  /** "card" = full banner (detail page); "inline" = compact one-liner (list rows). */
  variant?: "card" | "inline";
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(dueAt).getTime();
    const tick = () => setRemaining(target - Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [dueAt]);

  const expired = remaining !== null && remaining <= 0;
  const urgent = remaining !== null && remaining > 0 && remaining < 15 * 60 * 1000;

  if (variant === "inline") {
    const color = expired || urgent ? "var(--danger)" : "var(--warn-ink, var(--warn))";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 600,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        {expired
          ? "หมดเวลาชำระ"
          : `เหลือ ${remaining === null ? "—:—" : formatRemaining(remaining)}`}
      </span>
    );
  }

  const bg = expired
    ? "var(--danger-soft, rgba(220,38,38,0.07))"
    : urgent
      ? "var(--danger-soft, rgba(220,38,38,0.07))"
      : "var(--warn-soft, rgba(234,179,8,0.08))";
  const border = expired || urgent ? "var(--danger)" : "var(--warn)";
  const accent = expired || urgent ? "var(--danger)" : "var(--warn-ink, var(--warn))";

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: "6px 10px",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {expired ? (
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: accent }}>
          หมดเวลาชำระเงินแล้ว
          <span style={{ fontWeight: 400, fontSize: 11, color: "var(--ink-2)", marginLeft: 6 }}>
            คำจองจะถูกยกเลิกอัตโนมัติ
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>เหลือเวลาชำระเงิน</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: accent,
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.02em",
            }}
          >
            {remaining === null ? "—:—" : formatRemaining(remaining)}
          </span>
        </div>
      )}
    </div>
  );
}

/** ms → "H:MM:SS" (or "MM:SS" when under an hour). */
function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
