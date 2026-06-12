"use client";

import { useState } from "react";

type Props = {
  /** Unavailable dates as YYYY-MM-DD strings. */
  blackouts: string[];
  /** Optional initial year to display (defaults to current year) */
  initialYear?: number;
  /** Optional initial month to display (0-11, defaults to current month) */
  initialMonth?: number;
};

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TODAY = toLocalDateString(new Date());

export default function ProductAvailabilityCalendar({
  blackouts = [],
  initialYear,
  initialMonth,
}: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialYear ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? today.getMonth());

  const blackoutSet = new Set(blackouts);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Build a 6-row × 7-col grid (42 cells)
  const cells: Array<{ date: Date; inMonth: boolean } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  }
  while (cells.length < 42) cells.push(null);

  function prevMonth() {
    const nextYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const nextMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  }

  function nextMonth() {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: 8,
        marginBottom: 10,
        background: "var(--bg)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        ปฏิทินความว่าง
      </div>

      {/* Month/Year header and nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 4,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: "2px 4px",
            cursor: "pointer",
            fontSize: 14,
            color: "var(--ink)",
          }}
        >
          ← ย้อนหลัง
        </button>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            flex: 1,
            textAlign: "center",
            minWidth: 100,
          }}
        >
          {MONTHS_TH[viewMonth]} {viewYear}
        </div>
        <button
          onClick={nextMonth}
          style={{
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: "2px 4px",
            cursor: "pointer",
            fontSize: 14,
            color: "var(--ink)",
          }}
        >
          ถัดไป →
        </button>
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 3,
          textAlign: "center",
        }}
      >
        {DAYS_TH.map((day) => (
          <div
            key={day}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-3)",
              padding: "2px 0",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 5,
        }}
      >
        {cells.map((cell, i) => {
          if (!cell) {
            return (
              <div
                key={`empty-${i}`}
                style={{
                  width: "100%",
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "var(--ink-3)",
                }}
              />
            );
          }

          const dateStr = toLocalDateString(cell.date);
          const isToday = dateStr === TODAY;
          const isPast = dateStr < TODAY;
          const isBlackout = blackoutSet.has(dateStr);
          const isAvailable = !isBlackout && !isPast;

          let bgColor = "var(--bg)";
          let textColor = "var(--ink-3)";
          let borderColor = "var(--line)";

          if (isPast) {
            // Past dates are gray
            bgColor = "var(--bg)";
            textColor = "var(--ink-3)";
          } else if (isBlackout) {
            // Unavailable dates are red
            bgColor = "rgba(220, 38, 38, 0.1)";
            textColor = "#DC2626";
            borderColor = "rgba(220, 38, 38, 0.3)";
          } else if (isAvailable) {
            // Available dates are green
            bgColor = "rgba(34, 197, 94, 0.1)";
            textColor = "#22C55E";
            borderColor = "rgba(34, 197, 94, 0.3)";
          }

          if (isToday) {
            bgColor = "rgba(59, 130, 246, 0.1)";
            textColor = "#3B82F6";
            borderColor = "rgba(59, 130, 246, 0.3)";
          }

          return (
            <div
              key={dateStr}
              style={{
                width: "100%",
                padding: "5px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 3,
                border: `1px solid ${borderColor}`,
                background: bgColor,
                fontSize: 14,
                fontWeight: 500,
                color: textColor,
              }}
              title={`${dateStr}${isBlackout ? " (ไม่ว่าง)" : isAvailable ? " (ว่าง)" : " (ผ่านแล้ว)"}`}
            >
              {cell.date.getDate()}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          fontSize: 14,
        }}
      >
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          />
          <span style={{ color: "var(--ink-2)" }}>ว่าง</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
            }}
          />
          <span style={{ color: "var(--ink-2)" }}>ไม่ว่าง</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "var(--bg)",
              border: "1px solid var(--line)",
            }}
          />
          <span style={{ color: "var(--ink-2)" }}>ผ่านแล้ว</span>
        </div>
      </div>
    </div>
  );
}
