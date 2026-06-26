"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
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
  /** variantId → { "YYYY-MM-DD": bookedCount } — real customer bookings. */
  bookedByVariant?: Record<string, Record<string, number>>;
  /** variantId → stock capacity (quantity) for that size. */
  capacityByVariant?: Record<string, number>;
  /** variantId → individual bookings (with assigned unit code) for the popup. */
  bookingsByVariant?: Record<string, BookingItem[]>;
  /** variantId → every physical unit (id + code + status) for the free/booked breakdown. */
  unitsByVariant?: Record<string, UnitItem[]>;
  /** unitId → blocked dates (per-code closures). */
  initialUnitBlackouts?: Record<string, string[]>;
};

type UnitItem = { id: string; code: string; status: string };

type BookingItem = {
  start: string;
  end: string;
  code: string | null;
  statusLabel: string;
  tone: string;
  name: string | null;
};

const TONE_TEXT: Record<string, string> = {
  danger: "text-danger",
  warn: "text-warn",
  success: "text-success",
  info: "text-ink-2",
  neutral: "text-ink-3",
};

const TODAY_STR = toLocalYmd(new Date());

export default function AvailabilityCalendar({
  productId,
  variants,
  initialProductBlackouts,
  initialVariantBlackouts,
  bookedByVariant = {},
  capacityByVariant = {},
  bookingsByVariant = {},
  unitsByVariant = {},
  initialUnitBlackouts = {},
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
  // unitId → Set of blocked dates (per-code closures).
  const [unitBlackouts, setUnitBlackouts] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    for (const [uid, dates] of Object.entries(initialUnitBlackouts)) {
      map[uid] = new Set(dates);
    }
    return map;
  });

  // Size focus: "all" shows every size's chips; a variantId focuses one size and
  // shows its remaining-stock count per day.
  const [selectedSizeId, setSelectedSizeId] = useState<string>("all");

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

  function toggleUnit(dateStr: string, variantId: string, unitId: string) {
    setError(null);
    const uSet = unitBlackouts[unitId] ?? new Set<string>();
    const isBlocked = uSet.has(dateStr);
    const nextU = new Set(uSet);
    if (isBlocked) nextU.delete(dateStr);
    else nextU.add(dateStr);
    setUnitBlackouts((prev) => ({ ...prev, [unitId]: nextU }));

    startTransition(async () => {
      const res = await toggleBlackout(productId, dateStr, variantId, unitId);
      if (!res.ok) {
        setUnitBlackouts((prev) => ({ ...prev, [unitId]: uSet }));
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

  // Real-booking overlay for a date: total booked across sizes + per-size detail.
  function bookingStatus(dateStr: string) {
    let total = 0;
    let anyFull = false;
    const perSize = variants.map((v) => {
      const booked = bookedByVariant[v.id]?.[dateStr] ?? 0;
      const cap = capacityByVariant[v.id] ?? 0;
      total += booked;
      if (booked > 0 && booked >= cap) anyFull = true;
      return { id: v.id, label: v.label, booked, cap };
    });
    return { total, anyFull, perSize };
  }

  const sizeView = selectedSizeId !== "all";

  // Per-size unit ledger for a given day: which physical code is free vs booked
  // (and by whom). Focused size only when one tab is active. Used by the drawer.
  function sizeBreakdownFor(dateStr: string) {
    const focusVariant = sizeView ? variants.find((v) => v.id === selectedSizeId) : null;
    const popupVariants = focusVariant ? [focusVariant] : variants;
    const productClosed = productBlackouts.has(dateStr);
    return popupVariants.map((v) => {
      const dayHolds = (bookingsByVariant[v.id] ?? []).filter(
        (b) => b.start <= dateStr && dateStr <= b.end,
      );
      const heldByCode = new Map<string, BookingItem>();
      for (const b of dayHolds) if (b.code) heldByCode.set(b.code, b);
      const variantClosed = productClosed || (variantBlackouts[v.id]?.has(dateStr) ?? false);
      const allUnits = unitsByVariant[v.id] ?? [];
      const rows = allUnits.map((u) => {
        const unitClosed = unitBlackouts[u.id]?.has(dateStr) ?? false;
        return {
          id: u.id,
          code: u.code,
          status: u.status,
          booking: heldByCode.get(u.code) ?? null,
          unitClosed,
          // Closed by its own per-code block OR by the whole size/product being shut.
          closed: variantClosed || unitClosed,
        };
      });
      const unassigned = dayHolds.filter((b) => !b.code);
      const rentableCodes = allUnits.filter(
        (u) => u.status === "available" || u.status === "rented",
      ).length;
      const freeRows = rows.filter(
        (r) => !r.booking && !r.closed && (r.status === "available" || r.status === "rented"),
      ).length;
      const freeCodes = Math.max(0, freeRows - unassigned.length);
      return { id: v.id, label: v.label, rows, unassigned, rentableCodes, freeCodes, sizeClosed: variantClosed };
    });
  }

  return (
    <div>
      {variants.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSizeId("all")}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              !sizeView
                ? "border-accent bg-accent text-accent-ink"
                : "border-accent bg-accent-soft text-accent hover:bg-accent-soft"
            }`}
          >
            ทุกไซซ์
          </button>
          {variants.map((v) => {
            const active = selectedSizeId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedSizeId(v.id)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-accent-soft bg-accent-soft text-accent hover:border-accent"
                }`}
              >
                {v.label} · {capacityByVariant[v.id] ?? 0} ตัว
              </button>
            );
          })}
        </div>
      )}

      {variants.length > 0 && (
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.6 }}>
          {sizeView
            ? "เลขบนวัน = จำนวนคงเหลือของไซซ์นี้ · กดที่วันเพื่อปิด/ดูรายตัว"
            : "กดที่วันที่เพื่อเลือกปิดไซซ์ที่ต้องการ"}
        </div>
      )}

      <CalendarGrid
        navBtnStyle={navBtnStyle}
        onViewChange={(y, m) => { setViewYear(y); setViewMonth(m); }}
        renderDay={({ date, dateStr }) => {
          const isToday = dateStr === TODAY_STR;
          const isPast = dateStr < TODAY_STR;
          const { isProductWide, blockedVariants, allVariantsBlocked, someBlocked } = cellStatus(dateStr);
          const booking = bookingStatus(dateStr);
          const isActive = popupDate === dateStr;

          // Focused-size remaining-stock indicator for this day.
          const focusVariant = sizeView ? variants.find((v) => v.id === selectedSizeId) : null;
          let remaining: number | null = null;
          let remState: "free" | "partial" | "full" | "closed" = "free";
          if (focusVariant) {
            const cap = capacityByVariant[focusVariant.id] ?? 0;
            const booked = bookedByVariant[focusVariant.id]?.[dateStr] ?? 0;
            const blocked = isProductWide || (variantBlackouts[focusVariant.id]?.has(dateStr) ?? false);
            // Units of this size closed by a per-code block on this day.
            const unitBlockCount = (unitsByVariant[focusVariant.id] ?? []).filter(
              (u) => unitBlackouts[u.id]?.has(dateStr),
            ).length;
            if (blocked) {
              remaining = 0;
              remState = "closed";
            } else {
              remaining = Math.max(0, cap - booked - unitBlockCount);
              remState = remaining <= 0 ? "full" : booked > 0 || unitBlockCount > 0 ? "partial" : "free";
            }
          }

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
                  color: allVariantsBlocked ? "var(--on-dark)" : isPast ? "var(--ink-3)" : "var(--ink)",
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
                {/* Mini variant indicators (all-sizes view only) */}
                {variants.length > 0 && !sizeView && !isPast && !allVariantsBlocked && someBlocked && (
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
                {/* Focused-size remaining-stock count */}
                {focusVariant && !isPast && remaining !== null && (
                  <span
                    className={`mt-0.5 rounded px-1 text-[9px] font-bold leading-tight ${
                      remState === "free"
                        ? "text-success"
                        : remState === "partial"
                          ? "text-warn"
                          : "bg-danger text-white"
                    }`}
                  >
                    {remState === "closed" ? "ปิด" : remState === "full" ? "เต็ม" : `เหลือ ${remaining}`}
                  </span>
                )}
              </button>

              {/* At-a-glance booked-size chips along the bottom edge: each shows
                  which size is booked that day (red = that size is full). */}
              {!sizeView && booking.total > 0 && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0.5 flex flex-wrap justify-center gap-0.5 px-0.5">
                  {booking.perSize
                    .filter((s) => s.booked > 0)
                    .map((s) => (
                      <span
                        key={s.id}
                        className={`rounded px-1 text-[8px] font-bold leading-tight ${
                          s.booked >= s.cap ? "bg-danger text-white" : "bg-bg-hover text-ink-2"
                        }`}
                      >
                        {s.label}
                        {s.booked > 1 ? `×${s.booked}` : ""}
                      </span>
                    ))}
                </span>
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
            <Legend color="var(--danger)" label="ปิดทุกไซซ์" />
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
          {sizeView ? (
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
              <span className="font-bold text-success">เหลือ 3</span>
              <span>ว่างหมด</span>
              <span className="font-bold text-warn">เหลือ 1</span>
              <span>จองบางส่วน</span>
              <span className="rounded bg-danger px-1 text-[10px] font-bold text-white">เต็ม</span>
              <span>ไม่ว่าง · กดที่วันเพื่อดูรหัสตัว</span>
            </div>
          ) : (
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded bg-bg-hover px-1 text-[9px] font-bold leading-tight text-ink-2">M</span>
              <span className="rounded bg-danger px-1 text-[9px] font-bold leading-tight text-white">L</span>
              <span className="text-[12px] text-ink-3">ป้ายไซซ์บนวัน = ไซซ์ที่ลูกค้าจองจริง (แดง = ไซซ์นั้นเต็ม) · เลือกแท็บไซซ์เพื่อดูจำนวนคงเหลือ</span>
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

      {popupDate && (() => {
        const dateStr = popupDate;
        const breakdown = sizeBreakdownFor(dateStr);
        const isProductWide = productBlackouts.has(dateStr);
        const [, mm, dd] = dateStr.split("-");
        const dateLabel = `${Number(dd)} ${MONTHS_TH[Number(mm) - 1]}`;
        return (
          <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPopupDate(null)}
            />
            {/* Right-side drawer */}
            <div
              ref={popupRef}
              className="relative ml-auto h-full w-full max-w-sm overflow-y-auto border-l border-line bg-surface px-5 pb-8 pt-4 shadow-[-4px_0_24px_rgba(0,0,0,0.18)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-ink">{dateLabel}</h3>
                <button
                  type="button"
                  onClick={() => setPopupDate(null)}
                  className="rounded-full px-2 text-[20px] leading-none text-ink-3 hover:text-ink"
                  aria-label="ปิด"
                >
                  ✕
                </button>
              </div>

              <p className="mb-3 text-[12px] text-ink-3">กดปุ่มท้ายรหัสเพื่อปิด/เปิดเฉพาะตัวนั้นในวันนี้</p>

              {/* Per-size unit ledger: every physical code, its state, and a
                  per-code close toggle. */}
              {breakdown.some((s) => s.rows.length > 0 || s.unassigned.length > 0) ? (
                <div className="mb-4 flex flex-col gap-2.5">
                  {breakdown.map((s) => {
                    if (s.rows.length === 0 && s.unassigned.length === 0) return null;
                    return (
                      <div key={s.id} className="rounded-lg bg-bg-hover px-3 py-2.5 text-[13px] leading-tight">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink-2">ไซซ์ {s.label}</span>
                          <span className="text-[12px] font-semibold text-success">
                            ว่าง {s.freeCodes}/{s.rentableCodes}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {s.rows.map((r) => {
                            const unavailable = r.status === "repair" || r.status === "retired";
                            const canToggle = !r.booking && !unavailable && !s.sizeClosed;
                            return (
                              <div key={r.code} className="flex items-center justify-between gap-3">
                                <span className={`font-mono text-[12px] ${r.unitClosed ? "text-ink-3 line-through" : "text-ink-2"}`}>
                                  {r.code}
                                </span>
                                {r.booking ? (
                                  <span className={`text-[12px] font-semibold ${TONE_TEXT[r.booking.tone] ?? "text-ink-3"}`}>
                                    จอง · {r.booking.name ?? r.booking.statusLabel}
                                  </span>
                                ) : unavailable ? (
                                  <span className="text-[12px] text-ink-3">
                                    {r.status === "repair" ? "ติดซ่อม" : "ปลดระวาง"}
                                  </span>
                                ) : s.sizeClosed ? (
                                  <span className="text-[12px] text-ink-3">ปิดทั้งไซซ์</span>
                                ) : canToggle ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleUnit(dateStr, s.id, r.id)}
                                    disabled={pending}
                                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                      r.unitClosed
                                        ? "border-danger bg-danger text-white"
                                        : "border-success bg-success-soft text-success hover:bg-success-soft"
                                    }`}
                                  >
                                    {r.unitClosed ? "ปิดอยู่ · กดเปิด" : "ว่าง · กดปิด"}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                          {s.unassigned.map((b, i) => (
                            <div key={`u-${i}`} className="flex items-center justify-between gap-3">
                              <span className="text-[12px] text-ink-3">รอรับจอง (ยังไม่ระบุตัว)</span>
                              <span className={`text-[12px] font-semibold ${TONE_TEXT[b.tone] ?? "text-ink-3"}`}>
                                {b.name ?? b.statusLabel}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mb-4 rounded-lg bg-bg-hover px-3 py-3 text-center text-[13px] text-ink-3">
                  ยังไม่มีการจองในวันนี้
                </div>
              )}

              {/* Close-day controls */}
              <div className="border-t border-line pt-3">
                <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px] font-semibold">
                  <input
                    type="checkbox"
                    checked={isProductWide}
                    onChange={() => toggleProductWide(dateStr)}
                    disabled={pending}
                    className="h-4 w-4"
                    style={{ accentColor: "var(--danger)" }}
                  />
                  ปิดทุกไซซ์
                </label>
                {variants.map((v) => {
                  const blocked = isProductWide || (variantBlackouts[v.id]?.has(dateStr) ?? false);
                  return (
                    <label
                      key={v.id}
                      className={`flex items-center gap-2.5 py-1.5 text-[14px] ${
                        isProductWide ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={blocked}
                        onChange={() => {
                          if (!isProductWide) toggleVariant(dateStr, v.id);
                        }}
                        disabled={pending || isProductWide}
                        className="h-4 w-4"
                        style={{ accentColor: "var(--danger)" }}
                      />
                      ปิดเฉพาะไซซ์ {v.label}
                    </label>
                  );
                })}
              </div>

              {/* Mark a walk-in / backend booking for this day */}
              <div className="mt-4 border-t border-line pt-3">
                <Link
                  href={`/sell/products/${productId}/manual-booking?start=${dateStr}${
                    sizeView ? `&variant=${selectedSizeId}` : ""
                  }`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-ink transition-colors hover:opacity-90"
                >
                  + จองหน้าร้านวันนี้
                </Link>
                <p className="mt-1.5 text-center text-[12px] text-ink-3">
                  สร้างรายการจอง — เลือกรับหน้าร้าน / ส่งด่วน / ส่งพัสดุ
                </p>
              </div>
            </div>
          </div>
        );
      })()}
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
