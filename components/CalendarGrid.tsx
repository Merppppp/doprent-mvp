"use client";

import React, { useState } from "react";
import { DAYS_TH, MONTHS_TH, toLocalYmd } from "@/lib/date-th";

export type CalendarGridProps = {
  /** Initial year to display (defaults to current year). */
  initialYear?: number;
  /** Initial month to display, 0-indexed (defaults to current month). */
  initialMonth?: number;
  /**
   * Month names array, 0-indexed.
   * Default: MONTHS_TH (short Thai abbreviations, e.g. "ม.ค.").
   * Pass MONTHS_TH_FULL for long names (SellerCalendar).
   */
  months?: string[];
  /**
   * Year offset added to Gregorian year for display.
   * Default: 543 (Buddhist Era). Pass 0 for Gregorian (CE).
   */
  yearOffset?: number;
  /** Style applied to both ← and → nav buttons. */
  navBtnStyle?: React.CSSProperties;
  /** Content inside the ← nav button. Default: "←". */
  prevLabel?: React.ReactNode;
  /** Content inside the → nav button. Default: "→". */
  nextLabel?: React.ReactNode;
  /**
   * Gap (px) used for both the weekday-header row and the day-cell grid.
   * The weekday-header row also sets marginBottom = gap * 2.
   * Default: 4.
   */
  gap?: number;
  /** Extra style spread onto the month label <div> (fontWeight, fontSize, etc.). */
  monthLabelStyle?: React.CSSProperties;
  /**
   * Extra style spread onto each weekday label <div>.
   * Base style already includes: textAlign:"center", fontSize:11, fontWeight:600,
   * color:"var(--ink-3)", padding:"4px 0".
   */
  weekdayCellStyle?: React.CSSProperties;
  /** Style applied to blank (leading/trailing) grid cells. */
  blankCellStyle?: React.CSSProperties;
  /**
   * Render callback for each in-month day cell.
   * Blank cells are rendered as <div/> automatically by CalendarGrid.
   * `dateStr` is produced via toLocalYmd(date).
   */
  renderDay: (args: { date: Date; dateStr: string; inMonth: boolean }) => React.ReactNode;
  /**
   * Called whenever the displayed month changes (via prev/next navigation).
   * Useful for consumers that need to track the current view month for
   * per-month summary counts (e.g. "เดือนนี้: ปิด N วัน").
   */
  onViewChange?: (year: number, month: number) => void;
  /**
   * Content rendered below the grid (legend, summary, error block, etc.).
   */
  children?: React.ReactNode;
};

const defaultNavBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 6,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  fontSize: 16,
  cursor: "pointer",
};

export default function CalendarGrid({
  initialYear,
  initialMonth,
  months = MONTHS_TH,
  yearOffset = 543,
  navBtnStyle = defaultNavBtnStyle,
  prevLabel = "←",
  nextLabel = "→",
  gap = 4,
  monthLabelStyle,
  weekdayCellStyle,
  blankCellStyle,
  renderDay,
  onViewChange,
  children,
}: CalendarGridProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialYear ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ?? today.getMonth());

  function prevMonth() {
    const nextY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const nextM = viewMonth === 0 ? 11 : viewMonth - 1;
    setViewYear(nextY);
    setViewMonth(nextM);
    onViewChange?.(nextY, nextM);
  }

  function nextMonth() {
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    setViewYear(nextY);
    setViewMonth(nextM);
    onViewChange?.(nextY, nextM);
  }

  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Build 42-cell grid
  const cells: Array<{ date: Date; inMonth: boolean } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  }
  while (cells.length < 42) cells.push(null);

  return (
    <>
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
          {prevLabel}
        </button>
        <div style={{ fontWeight: 600, fontSize: 17, ...monthLabelStyle }}>
          {months[viewMonth]} {viewYear + yearOffset}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          style={navBtnStyle}
          aria-label="เดือนถัดไป"
        >
          {nextLabel}
        </button>
      </div>

      {/* Weekday header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap,
          marginBottom: gap * 2,
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
              ...weekdayCellStyle,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap,
        }}
      >
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} style={blankCellStyle} />;
          const dateStr = toLocalYmd(cell.date);
          return (
            <React.Fragment key={dateStr}>
              {renderDay({ date: cell.date, dateStr, inMonth: cell.inMonth })}
            </React.Fragment>
          );
        })}
      </div>

      {children}
    </>
  );
}
