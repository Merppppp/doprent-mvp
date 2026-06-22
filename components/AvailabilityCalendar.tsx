"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toggleBlackout } from "@/app/actions/availability";
import { MONTHS_TH, toLocalYmd } from "@/lib/date-th";
import CalendarGrid from "@/components/CalendarGrid";

type Variant = { id: string; label: string };

type Props = {
  productId: string;
  variants: Variant[];
  initialProductBlackouts: string[];
  initialVariantBlackouts: Record<string, string[]>;
};

const TODAY_STR = toLocalYmd(new Date());

export default function AvailabilityCalendar({
  productId,
  variants,
  initialProductBlackouts,
  initialVariantBlackouts,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [productBlackouts, setProductBlackouts] = useState<Set<string>>(
    new Set(initialProductBlackouts),
  );
  const [variantBlackouts, setVariantBlackouts] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    for (const v of variants) {
      map[v.id] = new Set(initialVariantBlackouts[v.id] || []);
    }
    return map;
  });

  // Popup state
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click
  useEffect(() => {
    if (!popupDate) return;
    function onClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupDate(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [popupDate]);

  function toggleProductWide(dateStr: string) {
    setError(null);
    const isBlocked = productBlackouts.has(dateStr);
    const next = new Set(productBlackouts);
    if (isBlocked) {
      next.delete(dateStr);
    } else {
      next.add(dateStr);
      // Also clear all variant-specific blackouts for this date
      const nextV = { ...variantBlackouts };
      for (const v of variants) {
        const s = new Set(nextV[v.id]);
        s.delete(dateStr);
        nextV[v.id] = s;
      }
      setVariantBlackouts(nextV);
    }
    setProductBlackouts(next);

    startTransition(async () => {
      const res = await toggleBlackout(productId, dateStr, null);
      if (!res.ok) {
        setProductBlackouts(productBlackouts);
        setError(res.error ?? "บันทึกไม่สำเร็จ");
      } else {
        router.refresh();
      }
    });
  }

  function toggleVariant(dateStr: string, variantId: string) {
    setError(null);
    const vSet = variantBlackouts[variantId] ?? new Set<string>();
    const isBlocked = vSet.has(dateStr);
    const nextV = new Set(vSet);
    if (isBlocked) nextV.delete(dateStr);
    else nextV.add(dateStr);
    setVariantBlackouts((prev) => ({ ...prev, [variantId]: nextV }));

    startTransition(async () => {
      const res = await toggleBlackout(productId, dateStr, variantId);
      if (!res.ok) {
        setVariantBlackouts((prev) => ({ ...prev, [variantId]: vSet }));
        setError(res.error ?? "บันทึกไม่สำเร็จ");
      } else {
        router.refresh();
      }
    });
  }

  // Summary helpers
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Count for summary
  const allBlockedDates = useMemo(() => {
    const set = new Set(productBlackouts);
    for (const v of variants) {
      const vSet = variantBlackouts[v.id];
      if (vSet) vSet.forEach((d) => set.add(d));
    }
    return set;
  }, [productBlackouts, variantBlackouts, variants]);

  const blockedFutureCount = Array.from(allBlockedDates).filter((d) => d >= TODAY_STR).length;

  // Cell status helper
  function cellStatus(dateStr: string) {
    const isProductWide = productBlackouts.has(dateStr);
    const blockedVariants = variants.filter((v) => variantBlackouts[v.id]?.has(dateStr));
    const allVariantsBlocked = isProductWide || blockedVariants.length === variants.length;
    const someBlocked = blockedVariants.length > 0;
    return { isProductWide, blockedVariants, allVariantsBlocked, someBlocked };
  }

  return (
    <div>
      {variants.length > 0 && (
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.6 }}>
          กดที่วันที่เพื่อเลือกปิดไซซ์ที่ต้องการ
        </div>
      )}

      <CalendarGrid
        navBtnStyle={navBtnStyle}
        onViewChange={(y, m) => { setViewYear(y); setViewMonth(m); }}
        renderDay={({ date, dateStr }) => {
          const isToday = dateStr === TODAY_STR;
          const isPast = dateStr < TODAY_STR;
          const { isProductWide, blockedVariants, allVariantsBlocked, someBlocked } = cellStatus(dateStr);
          const isActive = popupDate === dateStr;

          return (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => {
                  if (isPast) return;
                  setError(null);
                  if (variants.length === 0) {
                    // No variants — toggle product-wide directly
                    toggleProductWide(dateStr);
                  } else {
                    setPopupDate(isActive ? null : dateStr);
                  }
                }}
                disabled={isPast}
                style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  border: `1.5px solid ${isActive ? "var(--accent)" : allVariantsBlocked ? "var(--danger)" : someBlocked ? "var(--warn)" : isToday ? "var(--ink)" : "var(--line)"}`,
                  background: allVariantsBlocked
                    ? "var(--danger)"
                    : someBlocked
                      ? "var(--warn-soft, rgba(245,166,35,0.12))"
                      : isPast
                        ? "var(--bg)"
                        : "var(--surface)",
                  color: allVariantsBlocked ? "#fff" : isPast ? "var(--ink-3)" : "var(--ink)",
                  borderRadius: 6,
                  cursor: isPast ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 400,
                  opacity: isPast ? 0.4 : 1,
                  transition: "background 0.15s, border-color 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  padding: 2,
                }}
              >
                <span>{date.getDate()}</span>
                {/* Mini variant indicators */}
                {variants.length > 0 && !isPast && !allVariantsBlocked && someBlocked && (
                  <span style={{ display: "flex", gap: 2 }}>
                    {variants.map((v) => {
                      const blocked = variantBlackouts[v.id]?.has(dateStr);
                      return (
                        <span
                          key={v.id}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: blocked ? "var(--danger)" : "var(--success, #22c55e)",
                          }}
                        />
                      );
                    })}
                  </span>
                )}
              </button>

              {/* Popup */}
              {isActive && (
                <div
                  ref={popupRef}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 50,
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                    padding: "12px 14px",
                    minWidth: 180,
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
                    {date.getDate()} {MONTHS_TH[date.getMonth()]}
                  </div>

                  {/* All sizes toggle */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      cursor: "pointer",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--line)",
                      marginBottom: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isProductWide}
                      onChange={() => toggleProductWide(dateStr)}
                      disabled={pending}
                      style={{ width: 16, height: 16, accentColor: "var(--danger)" }}
                    />
                    ปิดทุกไซซ์
                  </label>

                  {/* Per-variant toggles */}
                  {variants.map((v) => {
                    const blocked = isProductWide || (variantBlackouts[v.id]?.has(dateStr) ?? false);
                    return (
                      <label
                        key={v.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 0",
                          cursor: isProductWide ? "not-allowed" : "pointer",
                          opacity: isProductWide ? 0.5 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={blocked}
                          onChange={() => {
                            if (!isProductWide) toggleVariant(dateStr, v.id);
                          }}
                          disabled={pending || isProductWide}
                          style={{ width: 16, height: 16, accentColor: "var(--danger)" }}
                        />
                        {v.label}
                      </label>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setPopupDate(null)}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      padding: "6px 0",
                      background: "none",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 12,
                      color: "var(--ink-2)",
                    }}
                  >
                    ปิด
                  </button>
                </div>
              )}
            </div>
          );
        }}
      >
        {/* Legend */}
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
            <Legend color="#DC2626" label="ปิดทุกไซซ์" />
            <Legend color="var(--warn-soft, rgba(245,166,35,0.12))" border="var(--warn)" label="ปิดบางไซซ์" />
            <Legend color="var(--surface)" border="var(--line)" label="ว่างทุกไซซ์" />
          </div>
          {variants.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success, #22c55e)", display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>ว่าง</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)", display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>ปิด</span>
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>= จุดสีแทนแต่ละไซซ์</span>
            </div>
          )}
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
