"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBlackout } from "@/app/actions/availability";

type Props = {
  productId: string;
  /** Existing blackout dates as YYYY-MM-DD strings. */
  initialBlackouts: string[];
};

import { DAYS_TH, MONTHS_TH, toLocalYmd } from "@/lib/date-th";

const TODAY_STR = toLocalYmd(new Date());

export default function AvailabilityCalendar({ productId, initialBlackouts }: Props) {
  const router = useRouter();
  const [blackouts, setBlackouts] = useState<Set<string>>(new Set(initialBlackouts));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Calendar view state (which month is displayed)
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Build a 6-row × 7-col grid (42 cells)
  const cells: Array<{ date: Date; inMonth: boolean } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null); // leading blanks
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  }
  while (cells.length < 42) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

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

  // Days from this month that are blocked
  const blockedThisMonth = Array.from(blackouts)
    .filter((d) => {
      const [y, m] = d.split("-");
      return parseInt(y) === viewYear && parseInt(m) - 1 === viewMonth;
    })
    .sort();
  const blockedFutureCount = Array.from(blackouts).filter((d) => d >= TODAY_STR).length;

  return (
    <div>
      {/* Month navigation header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={prevMonth}
          style={navBtnStyle}
          aria-label="เดือนก่อนหน้า"
        >
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: 17 }}>
          {MONTHS_TH[viewMonth]} {viewYear + 543}
        </div>
        <button type="button" onClick={nextMonth} style={navBtnStyle} aria-label="เดือนถัดไป">
          →
        </button>
      </div>

      {/* Weekday header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 8,
        }}
      >
        {DAYS_TH.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-3)",
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const dateStr = toLocalYmd(cell.date);
          const isToday = dateStr === TODAY_STR;
          const isPast = dateStr < TODAY_STR;
          const isBlocked = blackouts.has(dateStr);

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDateClick(cell.date)}
              disabled={isPast || pending}
              aria-pressed={isBlocked}
              aria-label={`${cell.date.getDate()} ${MONTHS_TH[viewMonth]}${isBlocked ? " (ไม่ว่าง)" : " (ว่าง)"}`}
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
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

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
          {blockedThisMonth.length > 0
            ? `เดือนนี้: ปิด ${blockedThisMonth.length} วัน`
            : "เดือนนี้: ยังไม่ปิดวันไหน"}
          {" · "}
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
