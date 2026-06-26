"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addAddress, updateAddress, createBooking } from "@/app/actions/bookings";
import type { Address } from "@/lib/types";
import type { BusinessHours } from "@/lib/hours";
import { fmtThai } from "@/lib/date-th";
import { useCart } from "@/lib/cart";
import type { IdCardItem } from "@/app/actions/id-cards";
import IdCardPicker from "@/components/IdCardPicker";

/* ── Shared time helpers (mirror CheckoutForm) ─────────────────── */

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

function minutesUntilCloseToday(hours: BusinessHours | null | undefined): number | null {
  if (!hours) return null;
  const now = new Date();
  const today = hours[now.getDay()];
  if (!today?.open) return null;
  const [closeH, closeM] = today.to.split(":").map(Number);
  return closeH * 60 + closeM - (now.getHours() * 60 + now.getMinutes());
}

function nightsBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.round((e - s) / 86_400_000) + 1;
}

/* ── Props ──────────────────────────────────────────────────────── */

type Props = {
  /** The group key: `${shopId}|${startDate}|${endDate}` */
  groupKey: string;
  addresses: Address[];
  shopHours?: BusinessHours | null;
  shopIsOpen?: boolean;
  /** ID card photos already uploaded by this user. */
  idCards?: IdCardItem[];
};

/* ── Sub-components ─────────────────────────────────────────────── */

function StepNum({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-accent text-accent-ink text-[12px] font-bold mr-2 align-middle">
      {n}
    </span>
  );
}

function Req() {
  return <span className="text-danger font-normal text-[13px]">*</span>;
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className={muted ? "text-ink-3" : "text-ink-2"}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${muted ? "text-ink-3" : "text-ink"}`}>{value}</span>
    </div>
  );
}

const addressLabelClass = "block text-[13px] font-medium text-ink-2 mb-1";

/* ── Main component ─────────────────────────────────────────────── */

export default function CartCheckoutForm({ groupKey, addresses: initialAddresses, shopHours, shopIsOpen, idCards = [] }: Props) {
  const router = useRouter();
  const { groups, clearGroup } = useCart();

  // Find the group from cart (client-side; may be null on first server render)
  const group = groups.find((g) => g.key === groupKey) ?? null;

  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedId, setSelectedId] = useState<string>(
    initialAddresses.find((a) => a.is_default)?.id ?? initialAddresses[0]?.id ?? ""
  );
  const [showAdd, setShowAdd] = useState(initialAddresses.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [deliveryMethod, setDeliveryMethod] = useState<"express" | "standard" | null>(null);

  // ID card state — tracks which path is currently selected in IdCardPicker.
  const [selectedIdCardPath, setSelectedIdCardPath] = useState<string>(
    idCards[0]?.path ?? "",
  );

  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(iv);
  }, []);

  const startDate = group?.startDate ?? "";
  const endDate = group?.endDate ?? "";

  const isSameDayStart = startDate === localToday();
  const minsToClose = useMemo(() => minutesUntilCloseToday(shopHours), [shopHours]);
  const expressAvailable = isSameDayStart
    ? shopIsOpen !== false && minsToClose != null && minsToClose > 60
    : true;
  const standardAvailable = !isSameDayStart;
  const noDeliveryToday = isSameDayStart && !expressAvailable;

  useEffect(() => {
    if (deliveryMethod === "express" && !expressAvailable) setDeliveryMethod(null);
    if (deliveryMethod === "standard" && !standardAvailable) setDeliveryMethod(null);
  }, [deliveryMethod, expressAvailable, standardAvailable]);

  useEffect(() => {
    if (deliveryMethod) return;
    if (expressAvailable && !standardAvailable) setDeliveryMethod("express");
  }, [deliveryMethod, expressAvailable, standardAvailable]);

  const deliveryComplete = deliveryMethod === "standard" || deliveryMethod === "express";

  /* ── Address mutations ─────────────────────────────────────────── */

  async function onAddAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await addAddress(fd);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
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
    if (!res.ok) { setError(res.error); return; }
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

  /* ── Confirm ───────────────────────────────────────────────────── */

  async function onConfirm() {
    if (!group) { setError("ไม่พบข้อมูลการจอง กรุณากลับไปที่ตะกร้า"); return; }
    if (!deliveryMethod) { setError("กรุณาเลือกวิธีจัดส่ง"); return; }
    if (!selectedId) { setError("กรุณาเลือกที่อยู่จัดส่ง"); return; }
    if (!selectedIdCardPath) { setError("กรุณาแนบรูปถ่ายบัตรประชาชน"); return; }
    setError("");
    setBusy(true);

    const itemsPayload = group.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      qty: i.qty,
    }));

    const fd = new FormData();
    fd.set("items", JSON.stringify(itemsPayload));
    fd.set("address_id", selectedId);
    fd.set("start_date", group.startDate);
    fd.set("end_date", group.endDate);
    fd.set("delivery_method", deliveryMethod);
    fd.set("id_card_path", selectedIdCardPath);

    const firstWithTimes = group.items.find((i) => i.startTime && i.endTime);
    if (firstWithTimes?.startTime) fd.set("start_time", firstWithTimes.startTime);
    if (firstWithTimes?.endTime) fd.set("end_time", firstWithTimes.endTime);

    const res = await createBooking(fd);
    if (!res.ok) { setBusy(false); setError(res.error); return; }
    clearGroup(groupKey);
    router.push(`/account/bookings/${res.id}`);
  }

  /* ── Derived totals ─────────────────────────────────────────────── */

  const nightsCount = startDate && endDate ? nightsBetween(startDate, endDate) : 0;

  /* ── Loading / empty state ─────────────────────────────────────── */

  if (!group) {
    return (
      <div className="py-12 text-center text-ink-2 text-[14px]">
        กำลังโหลดข้อมูลตะกร้า…
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="grid gap-6">
      {/* Shop hours for the first rental day (pickup day) — shown only when the
          seller configured hours. */}
      {shopHours ? (() => {
        const dow = new Date(`${startDate}T00:00:00`).getDay();
        const d = shopHours[dow];
        return (
          <div className="flex justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-[13px]">
            <span className="font-semibold text-ink-2">เวลาทำการวันรับชุด</span>
            <span className="text-ink">
              {fmtThai(startDate)} · {d && d.open ? `${d.from}–${d.to}` : "ปิด"}
            </span>
          </div>
        );
      })() : null}

      {/* Items summary */}
      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="px-4 py-3 bg-bg border-b border-line">
          <div className="font-semibold text-[14px] text-ink">{group.shopName}</div>
          <div className="text-[12px] text-ink-2 mt-0.5">
            {fmtThai(group.startDate)} → {fmtThai(group.endDate)} · {nightsCount} วัน
          </div>
        </div>
        <div className="px-4 divide-y divide-line">
          {group.items.map((item) => (
            <div key={item.id} className="flex gap-3 py-3 items-center">
              {item.productImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="w-12 h-14 rounded-lg object-cover shrink-0 bg-accent-soft"
                />
              ) : (
                <div className="w-12 h-14 rounded-lg shrink-0 bg-accent-soft" />
              )}
              <div className="flex-1 min-w-0 text-[13px]">
                <div className="font-semibold text-ink truncate">{item.productName}</div>
                {item.size ? <div className="text-ink-3">ไซซ์: {item.size}</div> : null}
                {item.qty > 1 ? <div className="text-ink-2">×{item.qty}</div> : null}
              </div>
              <div className="text-[13px] font-semibold text-ink shrink-0">
                ฿{(item.pricePerDay * nightsCount * item.qty).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 1. Delivery ═══ */}
      <section>
        <h2 className="text-[16px] font-semibold mb-3">
          <StepNum n={1} /> วิธีจัดส่ง <Req />
        </h2>
        {noDeliveryToday ? (
          <div className="p-4 rounded-xl border border-danger bg-danger-soft text-[13px] text-ink leading-relaxed">
            ตอนนี้เลยเวลาส่งด่วนสำหรับวันนี้แล้ว และส่งพัสดุไม่สามารถจัดส่งภายในวันได้
            กรุณาย้อนกลับไปเลือกวันรับชุดเป็นวันอื่น
          </div>
        ) : (
          <div className="grid gap-2">
            {expressAvailable && (
              <label
                className={`flex gap-3 items-center p-4 rounded-xl border-[1.5px] cursor-pointer transition-colors ${deliveryMethod === "express" ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === "express"}
                  onChange={() => setDeliveryMethod("express")}
                  className="w-[18px] h-[18px] accent-accent shrink-0"
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <div className="flex-1">
                  <div className="font-semibold text-[14px] text-ink">ส่งด่วน</div>
                  <div className="text-[12px] text-ink-3 mt-0.5">
                    ร้านจะจัดส่งวันที่ {fmtThai(startDate)}
                  </div>
                </div>
              </label>
            )}
            {standardAvailable && (
              <label
                className={`flex gap-3 items-center p-4 rounded-xl border-[1.5px] cursor-pointer transition-colors ${deliveryMethod === "standard" ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === "standard"}
                  onChange={() => setDeliveryMethod("standard")}
                  className="w-[18px] h-[18px] accent-accent shrink-0"
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${deliveryMethod === "standard" ? "text-accent" : "text-ink-2"}`}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                <div className="flex-1">
                  <div className="font-semibold text-[14px] text-ink">ส่งพัสดุ</div>
                  <div className="text-[12px] text-ink-3 mt-0.5">ร้านจะจัดส่งภายในวันที่ {fmtThai(addDaysStr(startDate, -1))}</div>
                </div>
              </label>
            )}
            {isSameDayStart && expressAvailable && (
              <p className="text-[12px] text-ink-3 pl-1">เช่าวันนี้จัดส่งได้เฉพาะแบบส่งด่วนเท่านั้น</p>
            )}
          </div>
        )}

        {deliveryMethod === "express" && (
          <p className="mt-4 text-[13px] text-ink-3 leading-relaxed">
            ร้านจะติดต่อนัดเวลารับ–ส่งกับคุณหลังยืนยันการชำระเงิน
          </p>
        )}
        {deliveryMethod === "standard" && (
          <p className="mt-4 text-[13px] text-ink-3 leading-relaxed">
            ร้านจะเลือกผู้ให้บริการขนส่งและแจ้งเลขพัสดุให้คุณหลังยืนยันการชำระเงิน
          </p>
        )}
      </section>

      {/* ═══ 2. Address ═══ */}
      <section className={deliveryComplete ? "opacity-100" : "opacity-50 pointer-events-none"}>
        <h2 className="text-[16px] font-semibold mb-3">
          <StepNum n={2} /> ที่อยู่จัดส่ง <Req />
        </h2>
        <div className="grid gap-2">
          {addresses.map((a) =>
            editingId === a.id ? (
              <form
                key={a.id}
                onSubmit={onEditAddress}
                className="p-4 rounded-xl border border-accent bg-surface grid gap-3"
              >
                <input type="hidden" name="id" value={a.id} />
                <div>
                  <label className={addressLabelClass}>ชื่อผู้รับ <Req /></label>
                  <input name="recipient_name" defaultValue={a.recipient_name} placeholder="เช่น สมชาย ใจดี" className="input" required />
                </div>
                <div>
                  <label className={addressLabelClass}>เบอร์โทร <Req /></label>
                  <input name="phone" type="tel" defaultValue={a.phone} placeholder="เช่น 0812345678" className="input" required />
                </div>
                <div>
                  <label className={addressLabelClass}>ที่อยู่จัดส่ง <Req /></label>
                  <textarea name="address_text" defaultValue={a.address_text} placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์" className="input" style={{ minHeight: 72, resize: "vertical" }} required />
                </div>
                <div>
                  <label className={addressLabelClass}>LINE ID (ไม่บังคับ)</label>
                  <input name="line_id" defaultValue={a.line_id ?? ""} placeholder="@line_id หรือไม่ใส่ก็ได้" className="input" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-dark" disabled={busy}>บันทึกการแก้ไข</button>
                  <button type="button" className="btn btn-outline" onClick={() => setEditingId(null)} disabled={busy}>ยกเลิก</button>
                </div>
              </form>
            ) : (
              <div key={a.id} className="relative">
                <label
                  className={`flex gap-3 p-3.5 pr-12 rounded-xl border cursor-pointer ${selectedId === a.id ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={selectedId === a.id}
                    onChange={() => setSelectedId(a.id)}
                    className="mt-1"
                  />
                  <span className="text-[14px] leading-relaxed">
                    <b>{a.recipient_name}</b> · {a.phone}
                    {a.is_default ? <span className="text-accent-2 text-[12px]"> (ค่าเริ่มต้น)</span> : null}
                    <br />
                    <span className="text-ink-2">{a.address_text}</span>
                  </span>
                </label>
                <button
                  type="button"
                  aria-label="แก้ไขที่อยู่"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(a.id); setShowAdd(false); }}
                  className="absolute top-1/2 -translate-y-1/2 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line bg-surface text-ink-2 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </button>
              </div>
            )
          )}
        </div>

        {showAdd ? (
          <form onSubmit={onAddAddress} className="mt-3 p-4 rounded-xl border border-line bg-surface grid gap-3">
            <div>
              <label className={addressLabelClass}>ชื่อผู้รับ <Req /></label>
              <input name="recipient_name" placeholder="เช่น สมชาย ใจดี" className="input" required />
            </div>
            <div>
              <label className={addressLabelClass}>เบอร์โทร <Req /></label>
              <input name="phone" type="tel" placeholder="เช่น 0812345678" className="input" required />
            </div>
            <div>
              <label className={addressLabelClass}>ที่อยู่จัดส่ง <Req /></label>
              <textarea name="address_text" placeholder="บ้านเลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์" className="input" style={{ minHeight: 72, resize: "vertical" }} required />
            </div>
            <div>
              <label className={addressLabelClass}>LINE ID (ไม่บังคับ)</label>
              <input name="line_id" placeholder="@line_id หรือไม่ใส่ก็ได้" className="input" />
            </div>
            <label className="text-[13px] flex gap-2 items-center">
              <input type="checkbox" name="is_default" /> ตั้งเป็นที่อยู่เริ่มต้น
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-dark" disabled={busy}>บันทึกที่อยู่</button>
              {addresses.length > 0 ? (
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)} disabled={busy}>ยกเลิก</button>
              ) : null}
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn-outline mt-3" onClick={() => setShowAdd(true)}>
            ＋ เพิ่มที่อยู่ใหม่
          </button>
        )}
      </section>

      {/* ═══ 3. Summary ═══ */}
      <section className="p-4 rounded-xl border border-line bg-surface text-[14px]">
        <h2 className="text-[16px] font-semibold mb-3">
          <StepNum n={3} /> สรุปการจอง
        </h2>
        <div className="mb-3 grid gap-1.5">
          {group.items.map((item) => (
            <div key={item.id} className="flex justify-between text-[13px]">
              <span className="text-ink-2 truncate max-w-[60%]">
                {item.productName}{item.size ? ` (${item.size})` : ""}
                {item.qty > 1 ? ` ×${item.qty}` : ""}
              </span>
              <span className="text-ink font-medium">
                ฿{(item.pricePerDay * nightsCount * item.qty).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-line my-2" />
        <Row label={`ค่าเช่ารวม (${nightsCount} วัน)`} value={`฿${group.estimatedRental.toLocaleString()}`} />
        <Row label="ค่ามัดจำรวม" value={`฿${group.estimatedDeposit.toLocaleString()}`} />
        <Row label="ค่าจัดส่ง" value="รอร้านคำนวณ" muted />
        <div className="border-t border-line my-2" />
        <Row label="ยอดเบื้องต้น" value={`฿${(group.estimatedRental + group.estimatedDeposit).toLocaleString()}`} bold />
        <p className="text-[12px] text-ink-3 mt-2 leading-relaxed">
          {fmtThai(group.startDate)} ถึง {fmtThai(group.endDate)} · ร้านจะใส่ค่าจัดส่งแล้วคุณค่อยจ่ายผ่าน QR PromptPay
        </p>
        {deliveryMethod && (
          <div className="mt-2 text-[12px] text-ink-2 px-3 py-1.5 bg-bg rounded-lg">
            {deliveryMethod === "express"
              ? "ส่งด่วน · ร้านนัดเวลารับ–ส่ง"
              : "ส่งพัสดุ · ร้านเลือกขนส่ง"}
          </div>
        )}
      </section>

      {/* ═══ 4. ID card photo ═══ */}
      <section>
        <h2 className="text-[16px] font-semibold mb-1">
          <StepNum n={4} /> ภาพถ่ายบัตรประชาชน <Req />
        </h2>
        <p className="text-[13px] text-ink-3 mb-3">
          ร้านต้องการบัตรประชาชนเพื่อยืนยันตัวตนผู้เช่า
        </p>
        <IdCardPicker
          initialCards={idCards}
          inputName="id_card_path"
          onSelect={setSelectedIdCardPath}
        />
      </section>

      {/* Errors */}
      {error ? (
        <div className="px-4 py-3 rounded-lg bg-danger-soft text-danger text-[13.5px]">
          {error}
        </div>
      ) : null}

      {!deliveryMethod && (
        <div className="flex items-center gap-1.5 text-[13px] text-danger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          กรุณาเลือกวิธีจัดส่ง
        </div>
      )}
      {deliveryComplete && !selectedId && (
        <div className="flex items-center gap-1.5 text-[13px] text-danger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          กรุณาเลือกหรือเพิ่มที่อยู่จัดส่ง
        </div>
      )}
      {deliveryComplete && selectedId && !selectedIdCardPath && (
        <div className="flex items-center gap-1.5 text-[13px] text-danger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          กรุณาแนบรูปถ่ายบัตรประชาชน
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-lg py-3.5 px-5 text-[15px]"
        onClick={onConfirm}
        disabled={busy || !deliveryComplete || !selectedId || !selectedIdCardPath}
      >
        {busy ? "กำลังส่งคำขอ…" : "ยืนยันจอง"}
      </button>
    </div>
  );
}
