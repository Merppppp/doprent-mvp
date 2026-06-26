import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForView, currentUserIsSellerOf, getBookingTimeline } from "@/lib/booking-queries";
import { getSignedPrivateUrl } from "@/lib/r2";
import { amountDue, BOOKING_STATUS_META } from "@/lib/bookings";
import { getTrustScore } from "@/lib/trust-score";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import TrustBadge from "@/components/TrustBadge";
import SellerBookingActions, { type ChannelOption } from "@/components/SellerBookingActions";
import SellerAddressChange from "@/components/SellerAddressChange";
import SlipImage from "@/components/SlipImage";
import { PAYMENT_CHANNEL_LABEL } from "@/lib/payments";
import { fmtRentalWindow } from "@/lib/date-th";
import { sizeLabel } from "@/lib/types";

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

  // Sign the refund slip URL if one has been uploaded.
  const refundSlipUrl = b.refund_slip_path ? await getSignedPrivateUrl(b.refund_slip_path) : null;

  const renterTrust = await getTrustScore(b.renter_id);
  const timeline = await getBookingTimeline(b.id);

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
        {b.dress_size ? <Row label="ไซซ์" value={sizeLabel(b.dress_size)} /> : null}
        <Row label="วันเช่า" value={fmtRentalWindow(b.start_date, b.end_date, b.start_time, b.end_time)} />
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
        {b.delivery_carrier ? <Row label="ขนส่ง" value={b.delivery_carrier} /> : null}
        {b.tracking_number ? <Row label="เลขพัสดุ" value={b.tracking_number} /> : null}
        {b.tracking_url ? (
          <div className="flex justify-between gap-4 py-1 text-sm">
            <span className="shrink-0 text-[var(--ink-3)]">ลิงก์ติดตาม</span>
            <a
              href={b.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-right font-medium text-[var(--accent)] underline"
            >
              ติดตามพัสดุ
            </a>
          </div>
        ) : null}
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
          <SlipImage src={slipUrl} />
        </div>
      ) : null}

      {/* Only show the standing reason while it reflects the CURRENT state.
          Once the booking moves on (e.g. a cancel-request was rejected and it's
          renting again) the reason lives in the timeline history below, not here. */}
      {b.cancel_reason && REASON_VISIBLE_STATUSES.has(b.status) ? (
        <div style={{ ...card, fontSize: 14, color: "var(--ink-2)" }}>
          <b>เหตุผล:</b> {b.cancel_reason}
        </div>
      ) : null}

      {/* Refund status — read-only for the seller */}
      {(b.refund_status === "required" || b.refund_status === "refunded") ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 mb-4">
          <div className="font-semibold text-sm mb-2">การคืนเงิน</div>
          <div className="flex justify-between gap-4 py-1 text-sm">
            <span className="text-[var(--ink-3)] shrink-0">สถานะ</span>
            <span className={`font-semibold ${b.refund_status === "refunded" ? "text-[var(--success)]" : "text-[var(--ink-2)]"}`}>
              {b.refund_status === "refunded" ? "คืนเงินแล้ว ✓" : "กำลังดำเนินการคืนเงิน"}
            </span>
          </div>
          {b.refund_amount ? (
            <div className="flex justify-between gap-4 py-1 text-sm">
              <span className="text-[var(--ink-3)] shrink-0">จำนวน</span>
              <span className="font-medium">฿{b.refund_amount.toLocaleString()}</span>
            </div>
          ) : null}
          {refundSlipUrl && b.refund_status === "refunded" ? (
            <div className="mt-3">
              <div className="text-xs text-[var(--ink-3)] mb-2">สลิปยืนยันการคืนเงิน</div>
              <SlipImage src={refundSlipUrl} contain />
            </div>
          ) : null}
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
        deliveryMethod={b.delivery_method}
      />

      {timeline.length > 0 ? (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>ประวัติการจอง</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <TimelineRow label="สร้างการจอง" at={b.created_at} isFirst />
            {timeline.map((ev, i) => (
              <TimelineRow key={i} label={ev.label} at={ev.at} note={ev.note} isLast={i === timeline.length - 1} />
            ))}
          </div>
        </div>
      ) : null}
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

function fmtThaiDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function TimelineRow({ label, at, note, isFirst, isLast }: { label: string; at: string; note?: string | null; isFirst?: boolean; isLast?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, minHeight: 36 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: isLast ? "var(--accent)" : "var(--ink-3)",
            border: isLast ? "2px solid var(--accent)" : "2px solid var(--ink-3)",
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: "var(--line)", marginTop: 2, marginBottom: 2 }} />
        )}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: isLast ? "var(--ink)" : "var(--ink-2)" }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{fmtThaiDateTime(at)}</div>
        {note ? <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>เหตุผล: {note}</div> : null}
      </div>
    </div>
  );
}

// Statuses where `cancelReason` is the booking's CURRENT, relevant reason.
// Outside these, any stored reason is stale and belongs to the timeline history.
const REASON_VISIBLE_STATUSES = new Set([
  "cancel_requested",
  "cancelled",
  "rejected",
  "slip_disputed",
  "payment_expired",
]);

const card: React.CSSProperties = {
  padding: 16,
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--surface)",
  marginBottom: 16,
};
