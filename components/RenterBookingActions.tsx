"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { cancelBooking, markSlipUploaded } from "@/app/actions/bookings";
import type { BookingStatus } from "@/lib/types";

type Props = {
  bookingId: string;
  status: BookingStatus;
  canPay: boolean; // waiting_for_payment + shop has promptpay + fee set
};

export default function RenterBookingActions({ bookingId, status, canPay }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSlip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const sb = createClient();
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${bookingId}/slip-${Date.now()}.${ext}`;
      const { data, error: upErr } = await sb.storage
        .from("payment-slips")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr || !data) {
        setError(`อัปโหลดสลิปไม่สำเร็จ: ${upErr?.message ?? "unknown"}`);
        setBusy(false);
        return;
      }
      const res = await markSlipUploaded(bookingId, data.path);
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!confirm("ยืนยันยกเลิกการจองนี้?")) return;
    setError("");
    setBusy(true);
    const res = await cancelBooking(bookingId);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  const canCancel = status === "booking_pending" || status === "waiting_for_payment";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {canPay ? (
        <label className="btn btn-primary btn-lg" style={{ textAlign: "center", cursor: "pointer", padding: "13px 18px" }}>
          {busy ? "กำลังอัปโหลด…" : "จ่ายแล้ว · อัปโหลดสลิป"}
          <input
            type="file"
            accept="image/*"
            onChange={onSlip}
            disabled={busy}
            style={{ display: "none" }}
          />
        </label>
      ) : null}

      {canCancel ? (
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
          ยกเลิกการจอง
        </button>
      ) : null}

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
    </div>
  );
}
