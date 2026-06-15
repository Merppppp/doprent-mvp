"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAddress, createBooking } from "@/app/actions/bookings";
import { priceForNights } from "@/lib/pricing";
import type { Address, PriceTier } from "@/lib/types";

type Props = {
  productId: string;
  startDate: string;
  endDate: string;
  days: number;
  pricePerDay: number;
  priceTiers?: PriceTier[] | null;
  deposit: number;
  addresses: Address[];
  /** Optional variant (size) chosen by the renter on the product detail page. */
  variantId?: string | null;
};

const fmtThai = (s: string) => {
  const [y, m, d] = s.split("-");
  return y ? `${d}/${m}/${y}` : s;
};

export default function CheckoutForm({
  productId,
  startDate,
  endDate,
  days,
  pricePerDay,
  priceTiers,
  deposit,
  addresses: initialAddresses,
  variantId,
}: Props) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedId, setSelectedId] = useState<string>(
    initialAddresses.find((a) => a.is_default)?.id ?? initialAddresses[0]?.id ?? ""
  );
  const [showAdd, setShowAdd] = useState(initialAddresses.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { perDay: effPerDay, total: rental } = priceForNights(priceTiers ?? null, pricePerDay, days);

  async function onAddAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await addAddress(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const newAddr: Address = {
      id: res.id,
      user_id: "",
      recipient_name: String(fd.get("recipient_name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address_text: String(fd.get("address_text") ?? ""),
      is_default: addresses.length === 0,
      created_at: new Date().toISOString(),
    };
    setAddresses((prev) => [...prev, newAddr]);
    setSelectedId(res.id);
    setShowAdd(false);
  }

  async function onConfirm() {
    if (!selectedId) {
      setError("กรุณาเลือกที่อยู่จัดส่ง");
      return;
    }
    setError("");
    setBusy(true);
    const fd = new FormData();
    fd.set("product_id", productId);
    fd.set("address_id", selectedId);
    fd.set("start_date", startDate);
    fd.set("end_date", endDate);
    if (variantId) fd.set("variant_id", variantId);
    const res = await createBooking(fd);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push(`/account/bookings/${res.id}`);
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* Address selection */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>ที่อยู่จัดส่ง</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {addresses.map((a) => (
            <label
              key={a.id}
              style={{
                display: "flex",
                gap: 10,
                padding: 14,
                border: `1px solid ${selectedId === a.id ? "var(--accent)" : "var(--line)"}`,
                borderRadius: 10,
                cursor: "pointer",
                background: selectedId === a.id ? "var(--accent-soft)" : "var(--surface)",
              }}
            >
              <input
                type="radio"
                name="addr"
                checked={selectedId === a.id}
                onChange={() => setSelectedId(a.id)}
                style={{ marginTop: 3 }}
              />
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>
                <b>{a.recipient_name}</b> · {a.phone}
                {a.is_default ? (
                  <span style={{ color: "var(--accent-2)", fontSize: 12 }}> (ค่าเริ่มต้น)</span>
                ) : null}
                <br />
                <span style={{ color: "var(--ink-2)" }}>{a.address_text}</span>
              </span>
            </label>
          ))}
        </div>

        {showAdd ? (
          <form
            onSubmit={onAddAddress}
            style={{
              marginTop: 12,
              padding: 16,
              border: "1px solid var(--line)",
              borderRadius: 10,
              display: "grid",
              gap: 10,
              background: "var(--surface)",
            }}
          >
            <input name="recipient_name" placeholder="ชื่อผู้รับ" style={inp} required />
            <input name="phone" placeholder="เบอร์โทร" style={inp} required />
            <textarea
              name="address_text"
              placeholder="ที่อยู่จัดส่ง (บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์)"
              style={{ ...inp, minHeight: 72, resize: "vertical" }}
              required
            />
            <label style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="is_default" /> ตั้งเป็นที่อยู่เริ่มต้น
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-dark" disabled={busy}>
                บันทึกที่อยู่
              </button>
              {addresses.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAdd(false)}
                  disabled={busy}
                >
                  ยกเลิก
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowAdd(true)}
            style={{ marginTop: 12 }}
          >
            ＋ เพิ่มที่อยู่ใหม่
          </button>
        )}
      </section>

      {/* Price summary */}
      <section
        style={{
          padding: 16,
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--surface)",
          fontSize: 14,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>สรุปการจอง</h2>
        <Row label={`ค่าเช่า (฿${effPerDay.toLocaleString()} × ${days} วัน)`} value={`฿${rental.toLocaleString()}`} />
        <Row label="ค่ามัดจำ" value={`฿${deposit.toLocaleString()}`} />
        <Row label="ค่าจัดส่ง" value="รอร้านคำนวณ" muted />
        <div style={{ borderTop: "1px solid var(--line)", margin: "10px 0" }} />
        <Row label="ยอดเบื้องต้น" value={`฿${(rental + deposit).toLocaleString()}`} bold />
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>
          วันที่ {fmtThai(startDate)} ถึง {fmtThai(endDate)} · ร้านจะใส่ค่าจัดส่งแล้วคุณค่อยจ่ายผ่าน QR PromptPay
        </p>
      </section>

      {error ? (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--danger-soft)",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={onConfirm}
        disabled={busy || !selectedId}
        style={{ padding: "14px 20px", fontSize: 15 }}
      >
        {busy ? "กำลังส่งคำขอ…" : "ยืนยันจอง"}
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: muted ? "var(--ink-3)" : "var(--ink-2)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: muted ? "var(--ink-3)" : "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 15,
  fontFamily: "inherit",
  background: "var(--bg)",
  color: "var(--ink)",
  boxSizing: "border-box",
};
