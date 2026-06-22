"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createManualBooking } from "@/app/actions/manual-booking";
import CalendarRangePicker from "@/components/CalendarRangePicker";
import { sizeLabel } from "@/lib/types";

type Variant = {
  id: string;
  size: string;
  pricePerDay: number;
  deposit: number;
  available: boolean;
  unavailable: string[];
};

type Props = {
  productId: string;
  productName: string;
  productImage: string | null;
  pricePerDay: number;
  deposit: number;
  variants: Variant[];
  unavailable: string[];
};

export default function ManualBookingForm({
  productId,
  productName,
  productImage,
  pricePerDay,
  deposit,
  variants,
  unavailable,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasVariants = variants.length > 0;
  const defaultVariantId = hasVariants ? (variants.find((v) => v.available)?.id ?? variants[0].id) : null;
  const [variantId, setVariantId] = useState<string | null>(defaultVariantId);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [customTotal, setCustomTotal] = useState("");

  const selectedVariant = hasVariants && variantId ? variants.find((v) => v.id === variantId) ?? null : null;
  const effectivePpd = selectedVariant?.pricePerDay ?? pricePerDay;
  const effectiveDeposit = selectedVariant?.deposit ?? deposit;

  const unavailableSet = useMemo(() => {
    const base = new Set(unavailable);
    if (selectedVariant?.unavailable) {
      for (const d of selectedVariant.unavailable) base.add(d);
    }
    return base;
  }, [unavailable, selectedVariant]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 86_400_000) + 1;
  }, [startDate, endDate]);

  const estimatedTotal = nights > 0 ? effectivePpd * nights : null;

  function handleSubmit() {
    setError(null);
    setSuccess(null);

    const fd = new FormData();
    fd.set("product_id", productId);
    if (variantId) fd.set("variant_id", variantId);
    fd.set("start_date", startDate);
    fd.set("end_date", endDate);
    fd.set("customer_name", customerName);
    fd.set("customer_phone", customerPhone);
    fd.set("internal_note", internalNote);
    if (useCustomTotal && customTotal) fd.set("custom_total", customTotal);

    startTransition(async () => {
      const res = await createManualBooking(fd);
      if (!res.ok) {
        setError(res.error);
      } else {
        setSuccess("สร้างรายการจองสำเร็จ");
        setTimeout(() => router.push(`/sell/bookings/${res.id}`), 1200);
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Product card */}
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: 14,
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--surface)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 60,
            height: 76,
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--bg)",
          }}
        >
          {productImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImage} alt={productName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "var(--accent-soft)" }} />
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{productName}</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
            ฿{effectivePpd.toLocaleString()}/วัน · มัดจำ ฿{effectiveDeposit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Variant selector */}
      {hasVariants && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เลือกไซซ์</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {variants.map((v) => {
              const isSelected = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={!v.available}
                  onClick={() => {
                    setVariantId(v.id);
                    setStartDate("");
                    setEndDate("");
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--line)"}`,
                    background: isSelected ? "var(--accent)" : !v.available ? "var(--bg)" : "var(--surface)",
                    color: isSelected ? "var(--accent-ink)" : !v.available ? "var(--ink-3)" : "var(--ink)",
                    borderRadius: 8,
                    cursor: !v.available ? "default" : "pointer",
                    opacity: !v.available ? 0.55 : 1,
                  }}
                >
                  {sizeLabel(v.size)}
                  <span style={{ fontSize: 11, color: isSelected ? "var(--accent-ink)" : "var(--ink-3)", marginLeft: 4 }}>
                    ฿{v.pricePerDay.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 16,
          background: "var(--surface)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>เลือกวันเช่า</div>
        <CalendarRangePicker
          start={startDate}
          end={endDate}
          onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          unavailable={unavailableSet}
        />
      </div>

      {/* Pricing summary */}
      {estimatedTotal !== null && (
        <div
          style={{
            padding: 14,
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "var(--ink-2)" }}>ค่าเช่า ({nights} วัน × ฿{effectivePpd.toLocaleString()})</span>
            <span style={{ fontWeight: 600 }}>฿{estimatedTotal.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-2)" }}>มัดจำ</span>
            <span style={{ fontWeight: 600 }}>฿{effectiveDeposit.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
            <span style={{ fontWeight: 600 }}>รวมทั้งหมด</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              ฿{(useCustomTotal && customTotal ? Number(customTotal) + effectiveDeposit : estimatedTotal + effectiveDeposit).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={useCustomTotal}
          onChange={(e) => setUseCustomTotal(e.target.checked)}
        />
        กำหนดยอดเช่าเอง (ตกลงราคาหน้าร้าน)
      </label>

      {useCustomTotal && (
        <label style={labelStyle}>
          ยอดเช่า (บาท)
          <input
            type="number"
            value={customTotal}
            onChange={(e) => setCustomTotal(e.target.value)}
            placeholder={estimatedTotal?.toString() ?? "0"}
            min={0}
            style={inputStyle}
          />
        </label>
      )}

      {/* Customer info */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 16,
          background: "var(--surface)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>ข้อมูลลูกค้า</div>
        <label style={labelStyle}>
          ชื่อลูกค้า *
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="ชื่อ-นามสกุล"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          เบอร์โทร
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0xx-xxx-xxxx"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          หมายเหตุภายใน
          <textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="เช่น ลูกค้า VIP, ตกลงราคาพิเศษ"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>
      </div>

      {/* Error / Success */}
      {error && (
        <div style={{ padding: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6, color: "var(--danger)", fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, color: "var(--success, #22c55e)", fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !startDate || !endDate || !customerName}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 10,
          border: "none",
          background: pending || !startDate || !endDate || !customerName ? "var(--line)" : "var(--accent)",
          color: pending || !startDate || !endDate || !customerName ? "var(--ink-3)" : "var(--accent-ink, #fff)",
          fontSize: 15,
          fontWeight: 600,
          cursor: pending ? "wait" : !startDate || !endDate || !customerName ? "not-allowed" : "pointer",
        }}
      >
        {pending ? "กำลังบันทึก…" : "สร้างรายการจอง (ยืนยันทันที)"}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginTop: 12,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink-2)",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--bg)",
  fontSize: 14,
  color: "var(--ink)",
  width: "100%",
};
