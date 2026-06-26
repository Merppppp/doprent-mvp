"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addAddress, updateAddress, createBooking } from "@/app/actions/bookings";
import { priceForNights } from "@/lib/pricing";
import type { Address, PriceTier } from "@/lib/types";
import { fmtThai } from "@/lib/date-th";
import type { BusinessHours } from "@/lib/hours";

type Props = {
  productId: string;
  startDate: string;
  endDate: string;
  /** Optional pickup/return time-of-day "HH:MM"; null = full day. */
  startTime?: string | null;
  endTime?: string | null;
  days: number;
  pricePerDay: number;
  priceTiers?: PriceTier[] | null;
  deposit: number;
  addresses: Address[];
  variantId?: string | null;
  shopHours?: BusinessHours | null;
  shopIsOpen?: boolean;
};

/** Local "today" as YYYY-MM-DD (browser clock = the renter's wall clock). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Shift a YYYY-MM-DD string by `delta` days, returning YYYY-MM-DD. */
function addDaysStr(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Minutes from now until the shop closes today. null when shop is closed today
 *  or hours are unknown. Negative when already past closing. */
function minutesUntilCloseToday(hours: BusinessHours | null | undefined): number | null {
  if (!hours) return null;
  const now = new Date();
  const today = hours[now.getDay()];
  if (!today?.open) return null;
  const [closeH, closeM] = today.to.split(":").map(Number);
  return closeH * 60 + closeM - (now.getHours() * 60 + now.getMinutes());
}

export default function CheckoutForm({
  productId,
  startDate,
  endDate,
  startTime,
  endTime,
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

  // Re-evaluate time-based gating every minute (today's cutoff shifts as time passes).
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Whether the rental starts today (same-day) — drives which methods are offered.
  const isSameDayStart = startDate === localToday();

  // Same-day delivery rules:
  //   • Express needs the shop open today with > 1h before closing (time to dispatch).
  //   • Standard (parcel) can never arrive same-day, so it's hidden when start = today.
  //   • Future dates: both methods are available.
  const minsToClose = useMemo(() => minutesUntilCloseToday(shopHours), [shopHours]);
  const expressAvailable = isSameDayStart
    ? shopIsOpen !== false && minsToClose != null && minsToClose > 60
    : true;
  const standardAvailable = !isSameDayStart;
  // Same-day but too late / shop closed → nothing can ship today.
  const noDeliveryToday = isSameDayStart && !expressAvailable;

  // Drop a selected method the moment it stops being valid (e.g. time passes).
  useEffect(() => {
    if (deliveryMethod === "express" && !expressAvailable) setDeliveryMethod(null);
    if (deliveryMethod === "standard" && !standardAvailable) setDeliveryMethod(null);
  }, [deliveryMethod, expressAvailable, standardAvailable]);

  // Auto-select when exactly one method is offered (same-day → express only).
  useEffect(() => {
    if (deliveryMethod) return;
    if (expressAvailable && !standardAvailable) setDeliveryMethod("express");
  }, [deliveryMethod, expressAvailable, standardAvailable]);

  const { perDay: effPerDay, total: rental } = priceForNights(priceTiers ?? null, pricePerDay, days);

  const deliveryComplete = deliveryMethod === "standard" || deliveryMethod === "express";

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
      line_id: String(fd.get("line_id") ?? "").trim() || null,
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
              line_id: String(fd.get("line_id") ?? "").trim() || null,
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
    if (startTime) fd.set("start_time", startTime);
    if (endTime) fd.set("end_time", endTime);
    if (variantId) fd.set("variant_id", variantId);
    fd.set("delivery_method", deliveryMethod);
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
      {/* Shop hours for the first rental day (pickup day) — shown only when the
          seller configured hours. */}
      {shopHours ? (() => {
        const dow = new Date(`${startDate}T00:00:00`).getDay();
        const d = shopHours[dow];
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>เวลาทำการวันรับชุด</span>
            <span style={{ color: "var(--ink)" }}>
              {fmtThai(startDate)} · {d && d.open ? `${d.from}–${d.to}` : "ปิด"}
            </span>
          </div>
        );
      })() : null}

      {/* ═══ 1. Delivery method (FIRST) ═══ */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          <StepNum n={1} /> วิธีจัดส่ง <Req />
        </h2>
        {noDeliveryToday ? (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              border: "1px solid var(--danger)",
              background: "var(--danger-soft)",
              fontSize: 13,
              color: "var(--ink)",
              lineHeight: 1.6,
            }}
          >
            ตอนนี้เลยเวลาส่งด่วนสำหรับวันนี้แล้ว และส่งพัสดุไม่สามารถจัดส่งภายในวันได้
            กรุณาย้อนกลับไปเลือกวันรับชุดเป็นวันอื่น
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {/* Express option — same-day messenger (or future-date delivery). */}
            {expressAvailable && (
              <label style={{ ...optionBtn(deliveryMethod === "express", false), cursor: "pointer" }}>
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === "express"}
                  onChange={() => { setDeliveryMethod("express"); }}
                  style={{ accentColor: "var(--accent)", width: 18, height: 18, flexShrink: 0 }}
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--accent)" }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>ส่งด่วน</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                    ร้านจะจัดส่งวันที่ {fmtThai(startDate)}
                  </div>
                </div>
              </label>
            )}

            {/* Standard option — parcel (future-date only; can't arrive same-day). */}
            {standardAvailable && (
              <label style={{ ...optionBtn(deliveryMethod === "standard", false), cursor: "pointer" }}>
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === "standard"}
                  onChange={() => setDeliveryMethod("standard")}
                  style={{ accentColor: "var(--accent)", width: 18, height: 18, flexShrink: 0 }}
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: deliveryMethod === "standard" ? "var(--accent)" : "var(--ink-2)" }}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>ส่งพัสดุ</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                    ร้านจะจัดส่งภายในวันที่ {fmtThai(addDaysStr(startDate, -1))}
                  </div>
                </div>
              </label>
            )}

            {isSameDayStart && expressAvailable && (
              <div style={{ fontSize: 12, color: "var(--ink-3)", paddingLeft: 2 }}>
                เช่าวันนี้จัดส่งได้เฉพาะแบบส่งด่วนเท่านั้น
              </div>
            )}
          </div>
        )}

        {/* Express: shop coordinates the exact pickup/delivery time after accepting. */}
        {deliveryMethod === "express" && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
            ร้านจะติดต่อนัดเวลารับ–ส่งกับคุณหลังยืนยันการชำระเงิน
          </div>
        )}

        {/* Standard: shop chooses the carrier after accepting the booking. */}
        {deliveryMethod === "standard" && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
            ร้านจะเลือกผู้ให้บริการขนส่งและแจ้งเลขพัสดุให้คุณหลังยืนยันการชำระเงิน
          </div>
        )}
      </section>

      {/* ═══ 2. Address selection ═══ */}
      <section style={{ opacity: deliveryComplete ? 1 : 0.5, pointerEvents: deliveryComplete ? "auto" : "none" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          <StepNum n={2} /> ที่อยู่จัดส่ง <Req />
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
                <div>
                  <label htmlFor={`recipient-name-${a.id}`} style={addressLabelStyle}>ชื่อผู้รับ <Req /></label>
                  <input id={`recipient-name-${a.id}`} name="recipient_name" defaultValue={a.recipient_name} placeholder="เช่น สมชาย ใจดี" className="input" required />
                </div>
                <div>
                  <label htmlFor={`phone-${a.id}`} style={addressLabelStyle}>เบอร์โทร <Req /></label>
                  <input id={`phone-${a.id}`} name="phone" type="tel" defaultValue={a.phone} placeholder="เช่น 0812345678" className="input" required />
                </div>
                <div>
                  <label htmlFor={`address-${a.id}`} style={addressLabelStyle}>ที่อยู่จัดส่ง <Req /></label>
                  <textarea
                    id={`address-${a.id}`}
                    name="address_text"
                    defaultValue={a.address_text}
                    placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                    className="input" style={{ minHeight: 72, resize: "vertical" }}
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`line-${a.id}`} style={addressLabelStyle}>LINE ID (ไม่บังคับ)</label>
                  <input id={`line-${a.id}`} name="line_id" defaultValue={a.line_id ?? ""} placeholder="@line_id หรือไม่ใส่ก็ได้" className="input" />
                </div>
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
            <div>
              <label htmlFor="new-recipient-name" style={addressLabelStyle}>ชื่อผู้รับ <Req /></label>
              <input id="new-recipient-name" name="recipient_name" placeholder="เช่น สมชาย ใจดี" className="input" required />
            </div>
            <div>
              <label htmlFor="new-phone" style={addressLabelStyle}>เบอร์โทร <Req /></label>
              <input id="new-phone" name="phone" type="tel" placeholder="เช่น 0812345678" className="input" required />
            </div>
            <div>
              <label htmlFor="new-address" style={addressLabelStyle}>ที่อยู่จัดส่ง <Req /></label>
              <textarea
                id="new-address"
                name="address_text"
                placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                className="input" style={{ minHeight: 72, resize: "vertical" }}
                required
              />
            </div>
            <div>
              <label htmlFor="new-line-id" style={addressLabelStyle}>LINE ID (ไม่บังคับ)</label>
              <input id="new-line-id" name="line_id" placeholder="@line_id หรือไม่ใส่ก็ได้" className="input" />
            </div>
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
          วันที่ {fmtThai(startDate)}{startTime ? ` ${startTime}` : ""} ถึง {fmtThai(endDate)}{endTime ? ` ${endTime}` : ""}
          {startTime && endTime ? "" : " · ทั้งวัน"} · ร้านจะใส่ค่าจัดส่งแล้วคุณค่อยจ่ายผ่าน QR PromptPay
        </p>
        {deliveryMethod && (
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6, padding: "6px 10px", background: "var(--bg)", borderRadius: 6 }}>
            {deliveryMethod === "express"
              ? "ส่งด่วน · ร้านนัดเวลารับ–ส่ง"
              : "ส่งพัสดุ · ร้านเลือกขนส่ง"}
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

      {/* Validation hints */}
      {!deliveryMethod && (
        <div style={{ fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          กรุณาเลือกวิธีจัดส่ง
        </div>
      )}
      {deliveryComplete && !selectedId && (
        <div style={{ fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          กรุณาเลือกหรือเพิ่มที่อยู่จัดส่ง
        </div>
      )}

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

const addressLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink-2)",
  marginBottom: 5,
};

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

function Req() {
  return <span style={{ color: "var(--danger)", fontWeight: 400, fontSize: 13 }}>*</span>;
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
