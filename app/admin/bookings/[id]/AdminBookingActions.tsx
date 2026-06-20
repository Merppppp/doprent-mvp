"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminAcceptSlip,
  adminApproveCancel,
  adminDenyCancel,
  adminForceStatus,
  adminRejectSlip,
} from "@/app/actions/admin";
import type { BookingStatus } from "@/lib/types";
import { BOOKING_STATUS_META } from "@/lib/bookings";

type Props = { bookingId: string; status: BookingStatus };

type ActionDef = {
  label: string;
  target?: BookingStatus;
  variant: "primary" | "danger" | "outline";
  confirm?: string;
  fn?: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

const ACTIONS: Partial<Record<BookingStatus, ActionDef[]>> = {
  booking_pending: [
    { label: "เลื่อนสถานะ → รอชำระเงิน", target: "waiting_for_payment", variant: "primary", confirm: "ต้องการเลื่อนเป็นรอชำระเงิน?" },
    { label: "ปฏิเสธคำขอ", target: "rejected", variant: "danger", confirm: "ปฏิเสธคำขอจอง?" },
    { label: "ยกเลิก", target: "cancelled", variant: "outline", confirm: "ยกเลิกการจองนี้?" },
  ],
  waiting_for_payment: [
    { label: "เลื่อนสถานะ → ตรวจสลิป", target: "payment_review", variant: "primary", confirm: "เลื่อนเป็นตรวจสลิป?" },
    { label: "ยกเลิก (หมดเวลาจ่าย)", target: "cancelled", variant: "outline", confirm: "ยกเลิกการจองนี้?" },
  ],
  payment_review: [
    { label: "ยืนยันสลิป · จองสำเร็จ", target: "confirmed", variant: "primary", confirm: "ยืนยันสลิป?" },
    { label: "สลิปไม่ถูกต้อง → ให้จ่ายใหม่", target: "waiting_for_payment", variant: "outline", confirm: "ส่งกลับให้จ่ายใหม่?" },
    { label: "ยกเลิก", target: "cancelled", variant: "danger", confirm: "ยกเลิกการจองนี้?" },
  ],
  confirmed: [
    { label: "เลื่อนเป็นกำลังเช่า", target: "renting", variant: "primary", confirm: "เลื่อนเป็นกำลังเช่า?" },
    { label: "ทำเครื่องหมายรับคืนแล้ว", target: "returned", variant: "outline", confirm: "ข้ามไปรับคืนเลย?" },
    { label: "ยกเลิก (ต้องคืนเงิน)", target: "cancelled", variant: "danger", confirm: "ยกเลิกการจองที่จ่ายแล้ว? ต้องประสานคืนเงินเอง" },
  ],
  renting: [
    { label: "ทำเครื่องหมายรับคืนแล้ว", target: "returned", variant: "primary", confirm: "ยืนยันรับคืนชุดแล้ว?" },
    { label: "ยกเลิก (ต้องคืนเงิน)", target: "cancelled", variant: "danger", confirm: "ยกเลิกการจองที่จ่ายแล้ว? ต้องประสานคืนเงินเอง" },
  ],
  returned: [
    { label: "ปิดรายการ · เสร็จสิ้น", target: "completed", variant: "primary", confirm: "ปิดรายการเช่า?" },
  ],
  cancel_requested: [
    { label: "อนุมัติยกเลิก", target: undefined, variant: "danger", confirm: "อนุมัติยกเลิก? (ถ้าจ่ายแล้ว ต้องประสานคืนเงิน)", fn: (id) => adminApproveCancel(id) },
    { label: "ไม่อนุมัติ · คืนสถานะเดิม", target: undefined, variant: "outline", confirm: "คืนสถานะก่อนหน้า?", fn: (id) => adminDenyCancel(id) },
  ],
  slip_disputed: [
    { label: "สลิปถูกต้อง · ยืนยันการจอง", target: undefined, variant: "primary", confirm: "ยืนยันว่าสลิปถูกต้อง?", fn: (id) => adminAcceptSlip(id) },
    { label: "สลิปไม่ถูกต้อง · ให้จ่ายใหม่", target: undefined, variant: "danger", confirm: "ส่งกลับให้ลูกค้าอัปโหลดสลิปใหม่?", fn: (id) => adminRejectSlip(id) },
  ],
};

export default function AdminBookingActions({ bookingId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forceTarget, setForceTarget] = useState("");

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

  const actions = ACTIONS[status];
  const meta = BOOKING_STATUS_META[status];
  const isTerminal = meta?.terminal;

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink-2)" }}>Admin Actions</div>

      {actions && actions.length > 0 ? (
        actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`btn ${a.variant === "primary" ? "btn-primary btn-lg" : a.variant === "danger" ? "btn btn-dark" : "btn-outline"}`}
            style={{
              padding: "12px 18px",
              fontSize: 14,
              ...(a.variant === "danger" ? { background: "var(--danger)", borderColor: "var(--danger)" } : {}),
            }}
            disabled={busy}
            onClick={() => {
              if (a.confirm && !confirm(a.confirm)) return;
              const note = prompt("หมายเหตุ (ไม่บังคับ)") ?? undefined;
              if (a.fn) {
                run(() => a.fn!(bookingId));
              } else if (a.target) {
                run(() => adminForceStatus(bookingId, a.target!, note));
              }
            }}
          >
            {a.label}
          </button>
        ))
      ) : isTerminal ? (
        <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "8px 0" }}>
          สถานะนี้เป็นสถานะสุดท้าย ไม่มี action ปกติ
        </div>
      ) : null}

      {/* Force override dropdown — always available */}
      <details style={{ marginTop: 4 }}>
        <summary style={{ fontSize: 13, color: "var(--ink-3)", cursor: "pointer", userSelect: "none" }}>
          บังคับเปลี่ยนสถานะ (override)
        </summary>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={forceTarget}
            onChange={(e) => setForceTarget(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 13,
              background: "var(--bg)",
              color: "var(--ink)",
              flex: "1 1 180px",
            }}
          >
            <option value="">— เลือกสถานะ —</option>
            {(Object.keys(BOOKING_STATUS_META) as BookingStatus[])
              .filter((s) => s !== status)
              .map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_META[s].label} ({s})
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: "8px 14px", fontSize: 13 }}
            disabled={busy || !forceTarget}
            onClick={() => {
              const targetLabel = BOOKING_STATUS_META[forceTarget as BookingStatus]?.label ?? forceTarget;
              if (!confirm(`บังคับเปลี่ยนจาก "${meta.label}" → "${targetLabel}"?`)) return;
              const note = prompt("เหตุผล (บังคับกรอก)");
              if (!note?.trim()) { setError("ต้องระบุเหตุผลสำหรับ override"); return; }
              run(() => adminForceStatus(bookingId, forceTarget, note!.trim()));
            }}
          >
            บังคับเปลี่ยน
          </button>
        </div>
      </details>

      {error ? <Err msg={error} /> : null}
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
