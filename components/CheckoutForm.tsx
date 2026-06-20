"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addAddress, updateAddress, createBooking } from "@/app/actions/bookings";
import { priceForNights } from "@/lib/pricing";
import type { Address, PriceTier } from "@/lib/types";
import { fmtThai } from "@/lib/date-th";
import type { BusinessHours } from "@/lib/hours";

const CARRIERS = [
  { key: "flash", label: "Flash Express" },
  { key: "kerry", label: "Kerry Express" },
  { key: "jt", label: "J&T Express" },
  { key: "thaipost", label: "ไปรษณีย์ไทย" },
] as const;

type Props = {
  productId: string;
  startDate: string;
  endDate: string;
  days: number;
  pricePerDay: number;
  priceTiers?: PriceTier[] | null;
  deposit: number;
  addresses: Address[];
  variantId?: string | null;
  shopHours?: BusinessHours | null;
  shopIsOpen?: boolean;
};

/** Generate express delivery time slots for today based on shop hours.
 *  Each slot is a 4-hour window. Slots start from (shop open + 4h) to (shop close).
 *  Only future slots (start >= next full hour from now) are returned. */
function buildExpressSlots(hours: BusinessHours | null | undefined): string[] {
  if (!hours) return [];
  const now = new Date();
  const dow = now.getDay();
  const today = hours[dow];
  if (!today?.open) return [];

  const [openH, openM] = today.from.split(":").map(Number);
  const [closeH, closeM] = today.to.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextFullHour = Math.ceil((nowMin + 1) / 60) * 60;

  const firstSlotStart = openMin + 240; // shop open + 4 hours
  const slots: string[] = [];

  for (let start = firstSlotStart; start + 240 <= closeMin; start += 60) {
    if (start < nextFullHour) continue;
    const end = start + 240;
    const sh = String(Math.floor(start / 60)).padStart(2, "0");
    const sm = String(start % 60).padStart(2, "0");
    const eh = String(Math.floor(end / 60)).padStart(2, "0");
    const em = String(end % 60).padStart(2, "0");
    slots.push(`${sh}:${sm}-${eh}:${em}`);
  }
  return slots;
}

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
  shopHours,
  shopIsOpen,
}: Props) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedId, setSelectedId] = useState<string>(
    initialAddresses.find((a) => a.is_default)?.id ?? initialAddresses[0]?.id ?? ""
  );
  const [showAdd, setShowAdd] = useState(initialAddresses.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Delivery state
  const [deliveryMethod, setDeliveryMethod] = useState<"express" | "standard" | null>(null);
  const [carrier, setCarrier] = useState<string | null>(null);
  const [expressSlot, setExpressSlot] = useState<string | null>(null);

  const expressSlots = useMemo(() => buildExpressSlots(shopHours), [shopHours]);
  const canExpress = expressSlots.length > 0 && shopIsOpen !== false;

  // Auto-clear express slot if it becomes unavailable (time passes)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (deliveryMethod !== "express") return;
    const iv = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(iv);
  }, [deliveryMethod]);

  const currentSlots = useMemo(() => buildExpressSlots(shopHours), [shopHours]);
  useEffect(() => {
    if (expressSlot && !currentSlots.includes(expressSlot)) {
      setExpressSlot(null);
    }
  }, [currentSlots, expressSlot]);

  const { perDay: effPerDay, total: rental } = priceForNights(priceTiers ?? null, pricePerDay, days);

  const deliveryComplete =
    deliveryMethod === "standard" ? !!carrier :
    deliveryMethod === "express" ? !!expressSlot :
    false;

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

  async function onEditAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateAddress(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const id = String(fd.get("id") ?? "");
    setAddresses((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              recipient_name: String(fd.get("recipient_name") ?? ""),
              phone: String(fd.get("phone") ?? ""),
              address_text: String(fd.get("address_text") ?? ""),
            }
          : a
      )
    );
    setEditingId(null);
  }

  async function onConfirm() {
    if (!deliveryMethod) {
      setError("กรุณาเลือกวิธีจัดส่ง");
      return;
    }
    if (deliveryMethod === "standard" && !carrier) {
      setError("กรุณาเลือกผู้ให้บริการขนส่ง");
      return;
    }
    if (deliveryMethod === "express" && !expressSlot) {
      setError("กรุณาเลือกช่วงเวลารับของ");
      return;
    }
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
    fd.set("delivery_method", deliveryMethod);
    if (deliveryMethod === "standard" && carrier) fd.set("delivery_carrier", carrier);
    if (deliveryMethod === "express" && expressSlot) fd.set("express_slot", expressSlot);
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
      {/* ═══ 1. Delivery method (FIRST) ═══ */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          <StepNum n={1} /> วิธีจัดส่ง
        </h2>
        <div style={{ display: "grid", gap: 8 }}>
          {/* Express option */}
          <button
            type="button"
            disabled={!canExpress}
            onClick={() => { setDeliveryMethod("express"); setCarrier(null); }}
            style={optionBtn(deliveryMethod === "express", !canExpress)}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚡</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>ส่งด่วน</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                {canExpress
                  ? "ได้รับภายในวัน — เลือกช่วงเวลารับของ"
                  : shopIsOpen === false
                    ? "ร้านปิดอยู่ — ไม่สามารถส่งด่วนได้"
                    : "ไม่มีช่วงเวลาว่างสำหรับวันนี้"}
              </div>
            </div>
            {deliveryMethod === "express" && <Check />}
          </button>

          {/* Standard option */}
          <button
            type="button"
            onClick={() => { setDeliveryMethod("standard"); setExpressSlot(null); }}
            style={optionBtn(deliveryMethod === "standard", false)}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>📦</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>ส่งพัสดุ</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                ไปรษณีย์ / Flash / Kerry / J&T — ใช้เวลา 1-3 วัน
              </div>
            </div>
            {deliveryMethod === "standard" && <Check />}
          </button>
        </div>

        {/* Express: time slot picker */}
        {deliveryMethod === "express" && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เลือกช่วงเวลารับของ</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
              {currentSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setExpressSlot(slot)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${expressSlot === slot ? "var(--accent)" : "var(--line)"}`,
                    background: expressSlot === slot ? "var(--accent)" : "var(--surface)",
                    color: expressSlot === slot ? "var(--accent-ink)" : "var(--ink)",
                    fontSize: 14,
                    fontWeight: expressSlot === slot ? 600 : 400,
                    cursor: "pointer",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {slot.replace("-", " – ")}
                </button>
              ))}
            </div>
            {currentSlots.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "12px 0" }}>
                ไม่มีช่วงเวลาว่างสำหรับวันนี้แล้ว
              </div>
            )}
          </div>
        )}

        {/* Standard: carrier picker */}
        {deliveryMethod === "standard" && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เลือกผู้ให้บริการขนส่ง</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {CARRIERS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCarrier(c.key)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${carrier === c.key ? "var(--accent)" : "var(--line)"}`,
                    background: carrier === c.key ? "var(--accent)" : "var(--surface)",
                    color: carrier === c.key ? "var(--accent-ink)" : "var(--ink)",
                    fontSize: 13,
                    fontWeight: carrier === c.key ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ 2. Address selection ═══ */}
      <section style={{ opacity: deliveryComplete ? 1 : 0.5, pointerEvents: deliveryComplete ? "auto" : "none" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          <StepNum n={2} /> ที่อยู่จัดส่ง
        </h2>
        <div style={{ display: "grid", gap: 8 }}>
          {addresses.map((a) =>
            editingId === a.id ? (
              <form
                key={a.id}
                onSubmit={onEditAddress}
                style={{
                  padding: 16,
                  border: "1px solid var(--accent)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 10,
                  background: "var(--surface)",
                }}
              >
                <input type="hidden" name="id" value={a.id} />
                <input name="recipient_name" defaultValue={a.recipient_name} placeholder="ชื่อผู้รับ" className="input" required />
                <input name="phone" defaultValue={a.phone} placeholder="เบอร์โทร" className="input" required />
                <textarea
                  name="address_text"
                  defaultValue={a.address_text}
                  placeholder="ที่อยู่จัดส่ง (บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์)"
                  className="input" style={{ minHeight: 72, resize: "vertical" }}
                  required
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="btn btn-dark" disabled={busy}>
                    บันทึกการแก้ไข
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setEditingId(null)}
                    disabled={busy}
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            ) : (
              <div key={a.id} style={{ position: "relative" }}>
                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: 14,
                    paddingRight: 48,
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
                <button
                  type="button"
                  aria-label="แก้ไขที่อยู่"
                  title="แก้ไขที่อยู่"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingId(a.id);
                    setShowAdd(false);
                  }}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: 10,
                    transform: "translateY(-50%)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    color: "var(--ink-2)",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              </div>
            )
          )}
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
            <input name="recipient_name" placeholder="ชื่อผู้รับ" className="input" required />
            <input name="phone" placeholder="เบอร์โทร" className="input" required />
            <textarea
              name="address_text"
              placeholder="ที่อยู่จัดส่ง (บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์)"
              className="input" style={{ minHeight: 72, resize: "vertical" }}
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

      {/* ═══ 3. Price summary ═══ */}
      <section
        style={{
          padding: 16,
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--surface)",
          fontSize: 14,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          <StepNum n={3} /> สรุปการจอง
        </h2>
        <Row label={`ค่าเช่า (฿${effPerDay.toLocaleString()} × ${days} วัน)`} value={`฿${rental.toLocaleString()}`} />
        <Row label="ค่ามัดจำ" value={`฿${deposit.toLocaleString()}`} />
        <Row label="ค่าจัดส่ง" value="รอร้านคำนวณ" muted />
        <div style={{ borderTop: "1px solid var(--line)", margin: "10px 0" }} />
        <Row label="ยอดเบื้องต้น" value={`฿${(rental + deposit).toLocaleString()}`} bold />
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>
          วันที่ {fmtThai(startDate)} ถึง {fmtThai(endDate)} · ร้านจะใส่ค่าจัดส่งแล้วคุณค่อยจ่ายผ่าน QR PromptPay
        </p>
        {deliveryMethod && (
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6, padding: "6px 10px", background: "var(--bg)", borderRadius: 6 }}>
            {deliveryMethod === "express"
              ? `⚡ ส่งด่วน · ช่วงเวลา ${expressSlot?.replace("-", " – ") ?? "—"}`
              : `📦 ${CARRIERS.find((c) => c.key === carrier)?.label ?? "ส่งพัสดุ"}`}
          </div>
        )}
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
        disabled={busy || !deliveryComplete || !selectedId}
        style={{ padding: "14px 20px", fontSize: 15 }}
      >
        {busy ? "กำลังส่งคำขอ…" : "ยืนยันจอง"}
      </button>
    </div>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 999,
        background: "var(--accent)",
        color: "var(--accent-ink)",
        fontSize: 12,
        fontWeight: 700,
        marginRight: 8,
        verticalAlign: "middle",
      }}
    >
      {n}
    </span>
  );
}

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function optionBtn(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "14px 16px",
    borderRadius: 10,
    border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}`,
    background: active ? "var(--accent-soft)" : disabled ? "var(--bg)" : "var(--surface)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    textAlign: "left",
  };
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
