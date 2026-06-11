import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { amountDue, BOOKING_STATUS_META } from "@/lib/bookings";
import { getSignedPrivateUrl } from "@/lib/r2";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import AdminBookingActions from "./AdminBookingActions";
import type { BookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "รายละเอียดการจอง · Admin",
  robots: { index: false, follow: false },
};

const fmtThai = (d: Date) => {
  const s = d.toISOString().slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};

const fmtDateTime = (d: Date) =>
  d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function AdminBookingDetail({ params }: { params: { id: string } }) {
  // Admin role is already enforced by app/admin/layout.tsx.
  const b = await db.booking.findUnique({
    where: { id: params.id },
    include: {
      dress: { select: { name: true, slug: true } },
      boutique: { select: { name: true, slug: true, promptpayId: true } },
      renter: { select: { name: true, email: true } },
    },
  });

  if (!b) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-2)" }}>
        <p style={{ marginBottom: 20 }}>ไม่พบการจองนี้</p>
        <Link href="/admin/bookings" className="btn btn-outline" style={{ padding: "10px 18px" }}>
          ← กลับไปหน้าการจอง
        </Link>
      </div>
    );
  }

  const status = b.status as BookingStatus;
  const meta = BOOKING_STATUS_META[status];
  // Slip is private in R2 — sign a short-lived URL (same mechanism as
  // GET /api/bookings/[id]/slip-url, which also allows admin).
  const slipUrl = b.slipPath ? await getSignedPrivateUrl(b.slipPath) : null;

  const total = amountDue({ rental_total: b.rentalTotal, deposit: b.deposit, shipping_fee: b.shippingFee });

  return (
    <div style={{ maxWidth: 640 }}>
      <Link href="/admin/bookings" style={{ fontSize: 14, color: "var(--ink-3)" }}>
        ← การจองทั้งหมด
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 6px" }}>
        <h1 className="page-title" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {b.dress?.name ?? "การจอง"}
        </h1>
        <BookingStatusBadge status={status} />
      </div>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 20 }}>
        {meta.label} · อัปเดตล่าสุด {fmtDateTime(b.updatedAt)}
      </p>

      <div style={card}>
        <Row label="รหัสการจอง" value={b.id} mono />
        <Row label="ผู้เช่า" value={`${b.renter?.name ?? "-"} · ${b.renter?.email ?? ""}`} />
        <Row label="ร้าน" value={b.boutique?.name ?? "-"} />
        <Row label="วันเช่า" value={`${fmtThai(b.startDate)} – ${fmtThai(b.endDate)}`} />
        <Row label="ผู้รับ" value={`${b.recipientName ?? "-"} · ${b.phone ?? ""}`} />
        <Row label="ที่อยู่จัดส่ง" value={b.addressText ?? "-"} />
        <Row label="สร้างเมื่อ" value={fmtDateTime(b.createdAt)} />
        <Row label="ครบกำหนดชำระ" value={b.currentDueAt ? fmtDateTime(b.currentDueAt) : "-"} />
      </div>

      <div style={card}>
        <Row label="ค่าเช่า" value={`฿${b.rentalTotal.toLocaleString()}`} />
        <Row label="ค่ามัดจำ" value={`฿${b.deposit.toLocaleString()}`} />
        <Row
          label="ค่าจัดส่ง"
          value={b.shippingFee == null ? "ยังไม่กำหนด" : `฿${b.shippingFee.toLocaleString()}`}
        />
        <Row label="ค่าคอมมิชชัน" value={b.commissionAmount == null ? "-" : `฿${b.commissionAmount.toLocaleString()}`} />
        <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />
        <Row label="ยอดที่ลูกค้าจ่าย" value={`฿${total.toLocaleString()}`} bold />
        <Row label="PromptPay ร้าน" value={b.boutique?.promptpayId ?? "-"} />
      </div>

      {b.cancelReason ? (
        <div style={{ ...card, fontSize: 14, color: "var(--ink-2)" }}>
          <b>เหตุผลจากร้าน:</b> {b.cancelReason}
          {b.cancelFromStatus ? (
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>
              สถานะก่อนหน้า: {BOOKING_STATUS_META[b.cancelFromStatus as BookingStatus]?.label ?? b.cancelFromStatus}
            </div>
          ) : null}
        </div>
      ) : null}

      {slipUrl ? (
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>สลิปการโอน</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slipUrl} alt="สลิป" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
        </div>
      ) : (
        <div style={{ ...card, fontSize: 14, color: "var(--ink-3)" }}>ยังไม่มีสลิปการโอน</div>
      )}

      <AdminBookingActions bookingId={b.id} status={status} />
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0", fontSize: 14 }}>
      <span style={{ color: "var(--ink-3)", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontWeight: bold ? 700 : 500,
          textAlign: "right",
          wordBreak: "break-word",
          fontFamily: mono ? "monospace" : undefined,
          fontSize: mono ? 12.5 : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 16,
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--surface)",
  marginBottom: 16,
};
