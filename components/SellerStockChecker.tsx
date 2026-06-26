"use client";

import { useState, useTransition } from "react";
import { getVariantAvailabilityByDate, type VariantDayAvailability } from "@/app/actions/availability";
import { sizeLabel } from "@/lib/types";
import { fmtThai } from "@/lib/date-th";

/**
 * Seller tool: pick a date and see how many units of each size are free that day.
 * Calls the auth-guarded getVariantAvailabilityByDate server action.
 */
export default function SellerStockChecker({
  productId,
  defaultDate,
}: {
  productId: string;
  /** YYYY-MM-DD to prefill (usually today in Bangkok). */
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const [rows, setRows] = useState<VariantDayAvailability[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedDate, setCheckedDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const check = () => {
    setError(null);
    startTransition(async () => {
      const res = await getVariantAvailabilityByDate(productId, date);
      if (!res.ok || !res.variants) {
        setError(res.error ?? "ตรวจสอบไม่สำเร็จ");
        setRows(null);
        return;
      }
      setRows(res.variants);
      setCheckedDate(res.date ?? date);
    });
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-3.5">
      <div className="mb-2.5 text-[13px] font-semibold">ตรวจสอบจำนวนว่างตามวันที่</div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-line bg-bg px-3 py-2 text-[13px] text-ink outline-none"
        />
        <button
          type="button"
          onClick={check}
          disabled={isPending || !date}
          className="rounded-lg border border-transparent bg-ink px-4 py-2 text-[13px] font-medium text-on-dark disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "กำลังตรวจ..." : "ตรวจสอบ"}
        </button>
      </div>

      {error ? <div className="mt-2.5 text-[12px] font-medium text-danger">{error}</div> : null}

      {rows ? (
        <div className="mt-3">
          <div className="mb-2 text-[12px] text-ink-3">
            วันที่ {checkedDate ? fmtThai(checkedDate) : ""}
          </div>
          {rows.length === 0 ? (
            <div className="text-[12px] text-ink-3">สินค้านี้ยังไม่มีไซซ์ย่อย</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {rows.map((v) => {
                const isFull = v.available && v.free === 0;
                return (
                  <span
                    key={v.variantId}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                      !v.available
                        ? "bg-bg-hover text-ink-3 line-through"
                        : isFull
                          ? "bg-danger-soft text-danger"
                          : "bg-success-soft text-success"
                    }`}
                  >
                    {sizeLabel(v.size)} · {v.quantity} ตัว
                    <span className="font-normal">ติดเช่า {v.out} · ว่าง {v.free}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
