"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import AvailabilityCalendar from "./AvailabilityCalendar";

type DressOption = {
  id: string;
  name: string;
  designer: string | null;
  tag_code: string;
  size: string;
  price_per_day: number;
};

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

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function parseMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

export default function SellerAvailabilityPicker({ dresses }: { dresses: DressOption[] }) {
  const [selectedDressId, setSelectedDressId] = useState(dresses[0]?.id ?? "");
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [blackouts, setBlackouts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDress = useMemo(
    () => dresses.find((d) => d.id === selectedDressId) ?? dresses[0] ?? null,
    [dresses, selectedDressId],
  );

  useEffect(() => {
    if (!selectedDressId) {
      setBlackouts([]);
      return;
    }

    const controller = new AbortController();
    async function loadBlackouts() {
      setLoading(true);
      setError(null);
      setBlackouts([]);
      const monthKey = getMonthKey(selectedYear, selectedMonth);
      try {
        const res = await fetch(
          `/api/dress-blackouts?dress_id=${encodeURIComponent(selectedDressId)}&month=${encodeURIComponent(
            monthKey,
          )}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "ไม่สามารถโหลดปฏิทินได้");
        }
        const data = (await res.json()) as { blackouts: string[] };
        setBlackouts(data.blackouts ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    loadBlackouts();
    return () => controller.abort();
  }, [selectedDressId, selectedYear, selectedMonth]);

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedDressId(event.target.value);
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  }

  function handleMonthChange(year: number, month: number) {
    setSelectedYear(year);
    setSelectedMonth(month);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <label
            htmlFor="seller-availability-dress"
            style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--ink-3)" }}
          >
            เลือกชุดเพื่อแก้ไขปฏิทิน
          </label>
          <select
            id="seller-availability-dress"
            value={selectedDressId}
            onChange={handleSelectChange}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--surface)",
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            {dresses.map((dress) => (
              <option key={dress.id} value={dress.id}>
                {dress.tag_code ? `${dress.tag_code} · ` : ""}{dress.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 260, fontSize: 13, color: "var(--ink-3)" }}>
          {selectedDress ? (
            <>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{selectedDress.name}</div>
              <div style={{ marginTop: 4 }}>
                {selectedDress.designer || "—"} · Size {selectedDress.size} · ฿{selectedDress.price_per_day.toLocaleString()}/วัน
              </div>
            </>
          ) : (
            "ไม่มีชุดให้เลือก"
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: 18, color: "var(--ink-3)", fontSize: 13 }}>กำลังโหลดปฏิทิน...</div>
      ) : null}
      {error ? (
        <div
          style={{
            marginTop: 18,
            color: "var(--danger)",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {selectedDress ? (
        <div
          style={{
            margin: "20px auto 0",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 18,
            background: "var(--surface)",
            maxWidth: 500,
          }}
        >
          <AvailabilityCalendar
            dressId={selectedDressId}
            initialBlackouts={blackouts}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>
      ) : null}
    </div>
  );
}
