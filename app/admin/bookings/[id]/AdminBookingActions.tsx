"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminAcceptSlip,
  adminApproveCancel,
  adminDenyCancel,
  adminRejectSlip,
} from "@/app/actions/admin";
import type { BookingStatus } from "@/lib/types";

type Props = { bookingId: string; status: BookingStatus };

export default function AdminBookingActions({ bookingId, status }: Props) {
  const router = useRouter();
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

  if (status === "cancel_requested") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          className="btn btn-dark"
          style={{ ...btn, background: "var(--danger)", borderColor: "var(--danger)" }}
          disabled={busy}
          onClick={() => {
            const note = prompt("หมายเหตุ (ถ้าลูกค้าจ่ายแล้ว ให้ประสานคืนเงินด้วย)") ?? undefined;
            run(() => adminApproveCancel(bookingId, note));
          }}
        >
          อนุมัติยกเลิกการจอง
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={btn}
          disabled={busy}
          onClick={() => {
            const note = prompt("เหตุผลที่ไม่อนุมัติ (แจ้งร้าน)") ?? undefined;
            run(() => adminDenyCancel(bookingId, note));
          }}
        >
          ไม่อนุมัติ · คืนสถานะเดิม
        </button>
        {error ? <Err msg={error} /> : null}
      </div>
    );
  }

  if (status === "slip_disputed") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          style={btn}
          disabled={busy}
          onClick={() => run(() => adminAcceptSlip(bookingId))}
        >
          สลิปถูกต้อง · ยืนยันการจอง
        </button>
        <button
          type="button"
          className="btn btn-outline"
          style={{ ...btn, color: "var(--danger)", borderColor: "var(--danger)" }}
          disabled={busy}
          onClick={() => {
            const note = prompt("เหตุผลที่สลิปไม่ถูกต้อง (ลูกค้าต้องอัปโหลดใหม่)");
            if (note && note.trim()) run(() => adminRejectSlip(bookingId, note.trim()));
          }}
        >
          สลิปไม่ถูกต้อง · ให้ลูกค้าอัปใหม่
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

const btn: React.CSSProperties = { padding: "12px 18px", fontSize: 14 };
