"use client";

import { useMemo, useRef, useState } from "react";
import { fmtThai, MONTHS_TH_FULL, DAYS_TH } from "@/lib/date-th";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return isoOf(d);
})();

function rangeDates(start: string, end: string): string[] {
  if (!start || !end) return [];
  const result: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];
  const cur = new Date(s);
  while (cur <= e) {
    result.push(isoOf(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

type Props = {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  unavailable?: Set<string>;
  minISO?: string;
};

export default function CalendarRangePicker({
  start,
  end,
  onChange,
  unavailable = new Set(),
  minISO = TODAY,
}: Props) {
  const init = start ? new Date(start) : new Date();
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });
  const [preview, setPreview] = useState("");
  const down = useRef(false);

  const rangeEnd = end || (preview && start && preview >= start ? preview : "");

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const isDisabled = (iso: string) => iso < minISO || unavailable.has(iso);

  const onDown = (iso: string) => {
    if (isDisabled(iso)) return;
    down.current = true;
    setPreview("");
    if (!start || (start && end)) onChange(iso, "");
    else if (iso < start) onChange(iso, "");
    else onChange(start, iso);
  };
  const onEnter = (iso: string) => {
    if (down.current && start && !end && !isDisabled(iso) && iso >= start) setPreview(iso);
  };
  const onUp = (iso: string) => {
    if (down.current && start && !end && iso > start && !isDisabled(iso)) onChange(start, iso);
    down.current = false;
    setPreview("");
  };

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const canPrev = `${view.y}-${pad(view.m + 1)}` > minISO.slice(0, 7);

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const nights = useMemo(() => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 86_400_000) + 1;
  }, [start, end]);

  const conflictDates = useMemo(() => {
    if (!start || !end) return [];
    return rangeDates(start, end).filter((d) => unavailable.has(d));
  }, [start, end, unavailable]);

  return (
    <div>
      <div
        style={{ userSelect: "none", touchAction: "manipulation" }}
        onPointerLeave={() => { down.current = false; setPreview(""); }}
        onPointerUp={() => { down.current = false; }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <NavBtn dir="prev" disabled={!canPrev} onClick={() => canPrev && shiftMonth(-1)} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {MONTHS_TH_FULL[view.m]} {view.y}
          </div>
          <NavBtn dir="next" onClick={() => shiftMonth(1)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 2 }}>
          {DAYS_TH.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--ink-3)", padding: "4px 0" }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, i) => {
            if (day == null) return <div key={`b${i}`} />;
            const iso = `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
            const disabled = isDisabled(iso);
            const isStart = !!start && iso === start;
            const isEnd = !!rangeEnd && iso === rangeEnd;
            const isToday = iso === TODAY;

            let bandBg = "transparent";
            let bandRadius = "0";
            if (start && rangeEnd && start !== rangeEnd && iso >= start && iso <= rangeEnd) {
              bandBg = "var(--accent-soft)";
              if (iso === start) bandRadius = "999px 0 0 999px";
              else if (iso === rangeEnd) bandRadius = "0 999px 999px 0";
            }

            const filled = isStart || isEnd;
            return (
              <div key={iso} style={{ display: "flex", justifyContent: "center", padding: "2px 0", background: bandBg, borderRadius: bandRadius }}>
                <button
                  type="button"
                  disabled={disabled}
                  onPointerDown={() => onDown(iso)}
                  onPointerEnter={() => onEnter(iso)}
                  onPointerUp={() => onUp(iso)}
                  aria-label={fmtThai(iso)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: isToday && !filled ? "1px solid var(--accent)" : "1px solid transparent",
                    background: filled ? "var(--accent)" : "transparent",
                    color: filled ? "var(--accent-ink)" : disabled ? "var(--ink-3)" : "var(--ink)",
                    fontSize: 14,
                    fontWeight: filled ? 600 : 400,
                    cursor: disabled ? "default" : "pointer",
                    opacity: disabled ? 0.4 : 1,
                    textDecoration: disabled && unavailable.has(iso) ? "line-through" : "none",
                    fontVariantNumeric: "tabular-nums",
                    padding: 0,
                  }}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "center", margin: "10px 0 2px", minHeight: 18 }}>
        {start && !end
          ? "เลือกวันคืนชุด (แตะหรือลากไปอีกวัน)"
          : start && end
            ? `${fmtThai(start)} → ${fmtThai(end)} (${nights} วัน)`
            : "แตะวันรับชุดเพื่อเริ่ม"}
      </div>

      {conflictDates.length > 0 && (
        <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6, fontSize: 13, color: "#DC2626", marginTop: 8, lineHeight: 1.5, fontWeight: 500 }}>
          ช่วงวันที่เลือกชนกับวันที่ไม่ว่าง กรุณาเลือกใหม่
        </div>
      )}

      {start && (
        <button
          type="button"
          onClick={() => onChange("", "")}
          style={{ fontSize: 12, color: "var(--ink-3)", background: "none", border: 0, cursor: "pointer", padding: "4px 0", marginTop: 4 }}
        >
          ล้างวันที่
        </button>
      )}
    </div>
  );
}

function NavBtn({ dir, onClick, disabled }: { dir: "prev" | "next"; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "เดือนก่อนหน้า" : "เดือนถัดไป"}
      style={{
        width: 30, height: 30, borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)",
        display: "grid", placeItems: "center", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1, color: "var(--ink-2)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <polyline points="15,6 9,12 15,18" /> : <polyline points="9,6 15,12 9,18" />}
      </svg>
    </button>
  );
}
