"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBlackout } from "@/app/actions/availability";

type Props = {
  productId: string;
  /** Existing blackout dates as YYYY-MM-DD strings. */
  initialBlackouts: string[];
};

import { MONTHS_TH, toLocalYmd } from "@/lib/date-th";
import CalendarGrid from "@/components/CalendarGrid";

const TODAY_STR = toLocalYmd(new Date());

export default function AvailabilityCalendar({ productId, initialBlackouts }: Props) {
  const router = useRouter();
  const [blackouts, setBlackouts] = useState<Set<string>>(new Set(initialBlackouts));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDateClick(date: Date) {
    const dateStr = toLocalYmd(date);
    // Don't allow past dates
    if (dateStr < TODAY_STR) return;
    setError(null);

    // Optimistic toggle
    const isBlocked = blackouts.has(dateStr);
    const next = new Set(blackouts);
    if (isBlocked) next.delete(dateStr);
    else next.add(dateStr);
    setBlackouts(next);

    startTransition(async () => {
      const res = await toggleBlackout(productId, dateStr);
      if (!res.ok) {
        // Revert
        setBlackouts(blackouts);
        setError(res.error ?? "บันทึกไม่สำเร็จ");
      } else {
        // Confirm state matches server
        const confirmed = new Set(blackouts);
        if (res.blocked) confirmed.add(dateStr);
        else confirmed.delete(dateStr);
        setBlackouts(confirmed);
        router.refresh();
      }
    });
  }

  // Days from this month that are blocked — computed from current view inside renderDay context
  // We track view state via a ref approach: use a state lifted from CalendarGrid is not possible
  // since CalendarGrid owns the view state. We compute blockedThisMonth from all blackouts.
  const blockedFutureCount = Array.from(blackouts).filter((d) => d >= TODAY_STR).length;

  return (
    <div>
      <CalendarGrid
        navBtnStyle={navBtnStyle}
        renderDay={({ date, dateStr }) => {
          const isToday = dateStr === TODAY_STR;
          const isPast = dateStr < TODAY_STR;
          const isBlocked = blackouts.has(dateStr);

          return (
            <button
              type="button"
              onClick={() => onDateClick(date)}
              disabled={isPast || pending}
              aria-pressed={isBlocked}
              aria-label={`${date.getDate()} ${MONTHS_TH[date.getMonth()]}${isBlocked ? " (ไม่ว่าง)" : " (ว่าง)"}`}
              style={{
                aspectRatio: "1/1",
                border: `1px solid ${isBlocked ? "var(--danger)" : isToday ? "var(--ink)" : "var(--line)"}`,
                background: isBlocked
                  ? "var(--danger)"
                  : isPast
                    ? "var(--bg)"
                    : "var(--surface)",
                color: isBlocked ? "var(--on-dark)" : isPast ? "var(--ink-3)" : "var(--ink)",
                borderRadius: 6,
                cursor: isPast ? "not-allowed" : pending ? "wait" : "pointer",
                fontSize: 14,
                fontWeight: isToday ? 700 : 400,
                position: "relative",
                opacity: isPast ? 0.4 : 1,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {date.getDate()}
            </button>
          );
        }}
      >
        {/* Legend + summary */}
        <div
          style={{
            marginTop: 18,
            padding: 12,
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
            <Legend color="#DC2626" label="ไม่ว่าง" />
            <Legend color="var(--surface)" border="var(--line)" label="ว่าง" />
            <Legend color="var(--bg)" border="var(--line)" label="ผ่านมาแล้ว" />
          </div>
          <div style={{ color: "var(--ink-2)" }}>
            ปิดล่วงหน้าทั้งหมด {blockedFutureCount} วัน
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: 6,
              color: "var(--danger)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        {pending ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-3)" }}>กำลังบันทึก…</div>
        ) : null}
      </CalendarGrid>
    </div>
  );
}

function Legend({
  color,
  border,
  label,
}: {
  color: string;
  border?: string;
  label: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 14,
          height: 14,
          background: color,
          border: border ? `1px solid ${border}` : "none",
          borderRadius: 3,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 6,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  fontSize: 16,
  cursor: "pointer",
};
