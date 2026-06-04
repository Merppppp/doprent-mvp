import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForView, currentUserIsSellerOf } from "@/lib/booking-queries";
import { amountDue, BOOKING_STATUS_META } from "@/lib/bookings";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import SellerBookingActions from "@/components/SellerBookingActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "รายละเอียดการจอง (ร้าน)",
  robots: { index: false, follow: false },
};

const fmtThai = (s: string) => {
  const [y, m, d] = s.split("-");
  return y ? `${d}/${m}/${y}` : s;
};

export default async function SellerBookingDetail({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/sell/bookings/${params.id}`);

  const b = await getBookingForView(params.id);
  if (!b) return <Fallback />;

  const isSeller = await currentUserIsSellerOf(b.boutique_id);
  if (!isSeller) redirect(`/account/bookings/${b.id}`);

  const meta = BOOKING_STATUS_META[b.status];

  const slipUrl: string | null = b.slip_path ?? null;

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 560 }}>
      <Link href="/sell/bookings" style={{ fontSize: 14, color: "var(--ink-3)" }}>
        ← การจองของร้าน
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 6px" }}>
        <h1 className="page-title" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {b.dress_name ?? "การจอง"}
        </h1>
        <BookingStatusBadge status={b.status} />
      </div>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 20 }}>{meta.sellerHint}</p>

      <div style={card}>
        <Row label="วันเช่า" value={`${fmtThai(b.start_date)} – ${fmtThai(b.end_date)}`} />
        <Row label="ผู้รับ" value={`${b.recipient_name ?? ""} · ${b.phone ?? ""}`} />
        <Row label="ที่อยู่จัดส่ง" value={b.address_text ?? "-"} />
      </div>

      <div style={card}>
        <Row label="ค่าเช่า" value={`฿${b.rental_total.toLocaleString()}`} />
        <Row label="ค่ามัดจำ" value={`฿${b.deposit.toLocaleString()}`} />
        <Row
          label="ค่าจัดส่ง"
          value={b.shipping_fee == null ? "ยังไม่กำหนด" : `฿${b.shipping_fee.toLocaleString()}`}
          muted={b.shipping_fee == null}
        />
        <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />
        <Row label="ยอดที่ลูกค้าจ่าย" value={`฿${amountDue(b).toLocaleString()}`} bold />
      </div>

      {slipUrl ? (
        <div style={{ ...card }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>สลิปการโอน</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slipUrl} alt="สลิป" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
        </div>
      ) : null}

      {b.cancel_reason ? (
        <div style={{ ...card, fontSize: 14, color: "var(--ink-2)" }}>
          <b>เหตุผล:</b> {b.cancel_reason}
        </div>
      ) : null}

      <SellerBookingActions bookingId={b.id} status={b.status} />
    </div>
  );
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
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0", fontSize: 14 }}>
      <span style={{ color: "var(--ink-3)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: muted ? "var(--ink-3)" : "var(--ink)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function Fallback() {
  return (
    <div className="shell" style={{ paddingTop: 80, paddingBottom: 100, maxWidth: 520, textAlign: "center" }}>
      <p style={{ fontSize: 16, color: "var(--ink-2)", marginBottom: 22 }}>ไม่พบการจองนี้</p>
      <Link href="/sell/bookings" className="btn btn-dark" style={{ padding: "12px 22px" }}>
        การจองของร้าน
      </Link>
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
