"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptBooking,
  confirmSlip,
  disputeSlip,
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
};

export default function SellerBookingActions({ bookingId, status, channels = [], defaultMethod = null }: Props) {
  const router = useRouter();
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
          onClick={() => {
            const reason = prompt("เหตุผลที่สลิปไม่ถูกต้อง (ส่งให้แอดมินตรวจ)");
            if (reason && reason.trim()) run(() => disputeSlip(bookingId, reason.trim()));
          }}
        >
          สลิปไม่ถูกต้อง
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => run(() => markReturned(bookingId))}
          style={{ padding: "13px 18px" }}
        >
          ทำเครื่องหมายว่ารับคืนแล้ว
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
