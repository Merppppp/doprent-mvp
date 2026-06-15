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

type Props = { bookingId: string; status: BookingStatus };

export default function SellerBookingActions({ bookingId, status }: Props) {
  const router = useRouter();
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy || !feeValid}
          onClick={() => run(() => acceptBooking(bookingId, feeNum))}
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
