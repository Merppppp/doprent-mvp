"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  acceptBooking,
  confirmSlip,
  disputeSlip,
  markRenting,
  markCompleted,
  markReturned,
  rejectBooking,
} from "@/app/actions/bookings";
import type { BookingStatus } from "@/lib/types";
import type { PaymentChannel } from "@/lib/payments";

/** A channel the shop has configured, with a human-readable preview line. */
export type ChannelOption = {
  method: PaymentChannel;
  label: string;
  /** e.g. PromptPay number, or "ธนาคารกสิกร · 123-4-56789-0 · ชื่อบัญชี" */
  detail: string;
};

type Props = {
  bookingId: string;
  status: BookingStatus;
  /** Channels the shop has set up + the shop's default — used by the accept flow. */
  channels?: ChannelOption[];
  defaultMethod?: PaymentChannel | null;
  /** "standard" | "express" — drives the carrier prompt on the ship step. */
  deliveryMethod?: string | null;
};

export default function SellerBookingActions({ bookingId, status, channels = [], defaultMethod = null, deliveryMethod = null }: Props) {
  const router = useRouter();
  const [fee, setFee] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  // Only let the seller pick when BOTH channels are configured.
  const canChoose = channels.length >= 2;
  const [method, setMethod] = useState<PaymentChannel | null>(
    canChoose ? (defaultMethod ?? channels[0]?.method ?? null) : null,
  );

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    setBusy(true);
    const res = await fn();
    if (!res.ok) {
      setError(res.error ?? "ทำรายการไม่สำเร็จ");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  if (status === "booking_pending") {
    const feeNum = Number(fee);
    const feeValid = fee !== "" && Number.isFinite(feeNum) && feeNum >= 0;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>
          ค่าจัดส่ง (฿)
          <input
            type="number"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="เช่น 80"
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 15,
              fontFamily: "inherit",
              background: "var(--bg)",
              color: "var(--ink)",
              boxSizing: "border-box",
            }}
          />
        </label>

        {canChoose ? (
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>ช่องทางรับเงินสำหรับการจองนี้</span>
            <div style={{ display: "grid", gap: 8 }}>
              {channels.map((c) => {
                const active = method === c.method;
                return (
                  <label
                    key={c.method}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "11px 13px",
                      border: `1.5px solid ${active ? "var(--primary, #2e9c65)" : "var(--line)"}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      background: active ? "var(--success-soft, rgba(46,156,101,0.07))" : "var(--bg)",
                    }}
                  >
                    <input
                      type="radio"
                      name="payment-channel"
                      checked={active}
                      onChange={() => setMethod(c.method)}
                      style={{ marginTop: 2, accentColor: "var(--primary, #2e9c65)" }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
                        {c.label}
                        {defaultMethod === c.method ? (
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", background: "var(--surface)", border: "1px solid var(--line)", padding: "1px 6px", borderRadius: 999 }}>
                            ค่าเริ่มต้น
                          </span>
                        ) : null}
                      </span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-3)", marginTop: 2, wordBreak: "break-word" }}>
                        {c.detail}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : channels.length === 1 ? (
          <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            จะเก็บเงินผ่าน <b style={{ color: "var(--ink-2)" }}>{channels[0].label}</b> — {channels[0].detail}
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy || !feeValid}
          onClick={() => run(() => acceptBooking(bookingId, feeNum, canChoose ? method : undefined))}
          style={{ padding: "13px 18px" }}
        >
          รับจอง (ใส่ค่าส่งแล้ว)
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={() => run(() => rejectBooking(bookingId))}
        >
          ปฏิเสธคำขอ
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  if (status === "payment_review") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => run(() => confirmSlip(bookingId))}
          style={{ padding: "13px 18px" }}
        >
          ยืนยันสลิป · จองสำเร็จ
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={() => setShowDisputeModal(true)}
        >
          สลิปไม่ถูกต้อง
        </button>
        {error ? <Err msg={error} /> : null}
        {showDisputeModal && (
          <DisputeModal
            busy={busy}
            onClose={() => setShowDisputeModal(false)}
            onSubmit={(reason) => {
              setShowDisputeModal(false);
              run(() => disputeSlip(bookingId, reason));
            }}
          />
        )}
      </div>
    );
  }

  if (status === "confirmed") {
    const isStandard = deliveryMethod === "standard";
    const isShipping = deliveryMethod === "standard" || deliveryMethod === "express";
    const carrierOk = !isStandard || carrier.trim().length > 0;
    // For any shipping method the seller must record how the renter can track
    // the parcel — at least a tracking number or a tracking URL.
    const trackingOk = !isShipping || trackingNumber.trim().length > 0 || trackingUrl.trim().length > 0;
    const urlOk = trackingUrl.trim().length === 0 || /^https?:\/\//i.test(trackingUrl.trim());
    const inputCls =
      "mt-1.5 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]";
    return (
      <div className="grid gap-3">
        {isStandard ? (
          <label className="text-sm font-semibold">
            ผู้ให้บริการขนส่ง
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="เช่น Flash Express, Kerry, ไปรษณีย์ไทย"
              maxLength={80}
              className={inputCls}
            />
          </label>
        ) : null}
        {isShipping ? (
          <>
            <label className="text-sm font-semibold">
              เลขพัสดุ / เลขติดตาม
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="เช่น TH1234567890"
                maxLength={120}
                className={inputCls}
              />
            </label>
            <label className="text-sm font-semibold">
              ลิงก์ติดตามการจัดส่ง (ถ้ามี)
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                className={inputCls}
              />
            </label>
            <p className="text-xs text-[var(--ink-3)]">กรอกเลขพัสดุหรือลิงก์ติดตามอย่างน้อยหนึ่งอย่าง เพื่อให้ผู้เช่าติดตามพัสดุได้</p>
          </>
        ) : null}
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy || !carrierOk || !trackingOk || !urlOk}
          onClick={() =>
            run(() =>
              markRenting(bookingId, {
                carrier: isStandard ? carrier.trim() : undefined,
                trackingNumber: isShipping ? trackingNumber.trim() || undefined : undefined,
                trackingUrl: isShipping ? trackingUrl.trim() || undefined : undefined,
              }),
            )
          }
        >
          ส่งชุดแล้ว · เริ่มเช่า
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  if (status === "renting" || status === "awaiting_return") {
    return (
      <div className="grid gap-3">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => run(() => markReturned(bookingId))}
          style={{ padding: "13px 18px" }}
        >
          ลูกค้าคืนชุดแล้ว
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  if (status === "returned") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => run(() => markCompleted(bookingId))}
          style={{ padding: "13px 18px" }}
        >
          ปิดรายการ
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  return null;
}

function DisputeModal({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg, #fff)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 420,
          padding: "22px 20px 18px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          สลิปไม่ถูกต้อง
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14 }}>
          กรุณาระบุเหตุผล เพื่อส่งให้แอดมินตรวจสอบ
        </p>
        <textarea
          ref={inputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="เช่น ยอดไม่ตรง, สลิปเบลอ, ชื่อไม่ตรง..."
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
            background: "var(--surface)",
            color: "var(--ink)",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ flex: 1, padding: "10px 0" }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !reason.trim()}
            onClick={() => onSubmit(reason.trim())}
            style={{ flex: 1, padding: "10px 0", fontWeight: 600 }}
          >
            ยืนยันส่ง
          </button>
        </div>
      </div>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "var(--danger-soft)",
        color: "var(--danger)",
        borderRadius: 8,
        fontSize: 13.5,
      }}
    >
      {msg}
    </div>
  );
}
