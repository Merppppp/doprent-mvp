"use client";

import { useEffect, useState } from "react";

/**
 * Seller-facing countdown showing how long until a payment slip is
 * auto-confirmed. Displayed when `status === "payment_review"` and
 * `slipConfirmDueAt` is set.
 *
 * The component ticks every second client-side (useEffect) to avoid
 * SSR hydration drift — same pattern as PaymentCountdown.
 */
export default function SlipConfirmCountdown({ dueAt }: { dueAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(dueAt).getTime();
    const tick = () => setRemaining(target - Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [dueAt]);

  if (remaining === null) return null;

  const expired = remaining <= 0;
  const urgent = !expired && remaining < 10 * 60 * 1000; // < 10 min

  const borderCls = expired
    ? "border-[var(--danger)]"
    : urgent
      ? "border-[var(--danger)]"
      : "border-amber-400";

  const bgCls = expired
    ? "bg-red-50 dark:bg-red-950/20"
    : urgent
      ? "bg-red-50 dark:bg-red-950/20"
      : "bg-amber-50 dark:bg-amber-950/20";

  const accentCls = expired || urgent
    ? "text-[var(--danger)]"
    : "text-amber-600 dark:text-amber-400";

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 mb-3 ${borderCls} ${bgCls}`}>
      {/* clock icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`shrink-0 ${accentCls}`}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>

      {expired ? (
        <div className={`flex-1 min-w-0 text-xs font-semibold ${accentCls}`}>
          หมดเวลาตรวจสลิป — ระบบยืนยันอัตโนมัติแล้ว
        </div>
      ) : (
        <div className="flex flex-1 min-w-0 items-baseline justify-between gap-2">
          <span className={`text-xs font-semibold ${accentCls}`}>
            ตรวจสลิปภายใน
          </span>
          <span
            className={`text-sm font-bold font-mono tabular-nums tracking-wide ${accentCls}`}
          >
            {formatRemaining(remaining)}
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
