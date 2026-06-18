import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForView, currentUserIsSellerOf } from "@/lib/booking-queries";
import { getSignedPrivateUrl } from "@/lib/r2";
import { amountDue, BOOKING_STATUS_META } from "@/lib/bookings";
import { getTrustScore } from "@/lib/trust-score";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import TrustBadge from "@/components/TrustBadge";
import SellerBookingActions, { type ChannelOption } from "@/components/SellerBookingActions";
import SellerAddressChange from "@/components/SellerAddressChange";
import { PAYMENT_CHANNEL_LABEL } from "@/lib/payments";
import { fmtThai } from "@/lib/date-th";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "รายละเอียดการจอง (ร้าน)",
  robots: { index: false, follow: false },
};

export default async function SellerBookingDetail({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/sell/bookings/${params.id}`);

  const b = await getBookingForView(params.id);
  if (!b) return <Fallback />;

  const isSeller = await currentUserIsSellerOf(b.boutique_id);
  if (!isSeller) redirect(`/account/bookings/${b.id}`);

  const meta = BOOKING_STATUS_META[b.status];

  // Slip is private — sign a short-lived URL for the seller (authorized above).
  const slipUrl = b.slip_path ? await getSignedPrivateUrl(b.slip_path) : null;

  // Sign the addr-change top-up slip URL (only for active sub-flow states)
  const addrSlipUrl = b.addr_change_slip_path
    ? await getSignedPrivateUrl(b.addr_change_slip_path)
    : null;

  // Trust score for this renter (single query — only one renter on a detail page).
  const renterTrust = await getTrustScore(b.renter_id);

  // Channels the shop has configured — drives the accept-flow channel picker.
  const channels: ChannelOption[] = [];
  if (b.boutique_promptpay_id?.trim()) {
    channels.push({
      method: "promptpay",
      label: PAYMENT_CHANNEL_LABEL.promptpay,
      detail: b.boutique_promptpay_id.trim(),
    });
  }
  if (b.boutique_bank_account_number?.trim()) {
    channels.push({
      method: "bank",
      label: PAYMENT_CHANNEL_LABEL.bank,
      detail: [b.boutique_bank_name, b.boutique_bank_account_number, b.boutique_bank_account_name]
        .filter((s) => s && s.trim())
        .join(" · "),
    });
  }

  return (
    <div className="container" style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 560 }}>
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
        {/* Renter row: recipient name + reliability badge */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0", fontSize: 14 }}>
          <span style={{ color: "var(--ink-3)", flexShrink: 0 }}>ผู้เช่า / ผู้รับ</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, color: "var(--ink)", textAlign: "right", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {b.recipient_name ?? ""}
            {b.phone ? ` · ${b.phone}` : ""}
            <TrustBadge score={renterTrust} style={{ marginLeft: 2 }} />
          </span>
        </div>
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
        {b.payment_method ? (
          <Row label="เก็บเงินผ่าน" value={PAYMENT_CHANNEL_LABEL[b.payment_method]} />
        ) : null}
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

      {["requested", "approved", "paid_review"].includes(b.addr_change_status ?? "") ? (
        <SellerAddressChange
          bookingId={b.id}
          status={b.addr_change_status}
          pending={
            b.pending_recipient_name || b.pending_phone || b.pending_address_text
              ? {
                  recipientName: b.pending_recipient_name,
                  phone: b.pending_phone,
                  addressText: b.pending_address_text,
                }
              : null
          }
          currentShippingFee={b.shipping_fee}
          diff={b.addr_change_diff}
          slipUrl={addrSlipUrl}
          reason={b.addr_change_reason}
        />
      ) : null}

      <SellerBookingActions
        bookingId={b.id}
        status={b.status}
        channels={channels}
        defaultMethod={b.boutique_default_payment_method}
      />
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
    <div className="container" style={{ paddingTop: 80, paddingBottom: 100, maxWidth: 520, textAlign: "center" }}>
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
