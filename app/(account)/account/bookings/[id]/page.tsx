import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForView, getBookingTimeline } from "@/lib/booking-queries";
import { amountDue, BOOKING_STATUS_META } from "@/lib/bookings";
import { promptPayQrDataUrl } from "@/lib/payments";
import { privateImageUrl } from "@/lib/r2";
import { db } from "@/lib/db";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import RenterBookingActions from "@/components/RenterBookingActions";
import ReviewForm from "@/components/ReviewForm";
import EditAddressForm from "@/components/EditAddressForm";
import ShopSocialLinks from "@/components/ShopSocialLinks";
import RenterAddressChange from "@/components/RenterAddressChange";
import SlipImage from "@/components/SlipImage";
import PaymentCountdown from "@/components/PaymentCountdown";
import { fmtRentalWindow } from "@/lib/date-th";
import { sizeLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "รายละเอียดการจอง",
  robots: { index: false, follow: false },
};

export default async function RenterBookingDetail({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/bookings/${params.id}`);

  const b = await getBookingForView(params.id);
  if (!b) {
    return <Fallback />;
  }
  // sellers viewing their own shop's booking belong on the seller page
  if (b.renter_id !== user.id) redirect(`/sell/bookings/${b.id}`);

  const total = amountDue(b);
  const meta = BOOKING_STATUS_META[b.status];

  // Fetch existing review for this booking
  const existingReview = await db.review.findUnique({
    where: { bookingId: b.id },
    select: { id: true, rating: true, comment: true, createdAt: true, sellerRepliedAt: true },
  });

  const timeline = await getBookingTimeline(b.id);
  const slipUrl = b.slip_path ? privateImageUrl(b.slip_path) : null;
  const refundSlipUrl = b.refund_slip_path ? privateImageUrl(b.refund_slip_path) : null;
  const idCardUrl = b.id_card_path ? privateImageUrl(b.id_card_path) : null;

  const isReviewable = b.status === "returned" || b.status === "completed";
  const canEditAddress = b.status === "booking_pending" || b.status === "waiting_for_payment";

  // Once the shop accepts, it picks ONE channel to collect through — show only
  // that one. Legacy bookings (accepted before this feature, payment_method
  // null) fall back to showing every channel the shop has configured.
  const showPromptpay = b.payment_method ? b.payment_method === "promptpay" : true;
  const showBank = b.payment_method ? b.payment_method === "bank" : true;

  // QR only while waiting for payment + shop has PromptPay + fee set + chosen channel
  const qr =
    b.status === "waiting_for_payment" && b.shipping_fee != null && showPromptpay
      ? await promptPayQrDataUrl(b.boutique_promptpay_id, total)
      : null;

  // QR for addr-change diff top-up (only when approved + diff > 0 + shop has PromptPay)
  const diffQr =
    b.status === "confirmed" &&
    b.addr_change_status === "approved" &&
    (b.addr_change_diff ?? 0) > 0 &&
    showPromptpay
      ? await promptPayQrDataUrl(b.boutique_promptpay_id, b.addr_change_diff!)
      : null;

  /* ── Sidebar column: timeline + review (desktop right, mobile bottom) ── */
  const sideContent = (
    <>
      {/* Timeline */}
      {timeline.length > 0 ? (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>ประวัติการจอง</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <TimelineRow label="สร้างการจอง" at={b.created_at} isFirst />
            {timeline.map((ev, i) => (
              <TimelineRow key={i} label={ev.label} at={ev.at} note={ev.note} isLast={i === timeline.length - 1} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Review */}
      {isReviewable ? (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>รีวิวร้าน</div>
          {existingReview ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} style={{ color: s <= existingReview.rating ? "var(--gold)" : "var(--line)", fontSize: 16 }}>★</span>
                  ))}
                </span>
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                  {existingReview.createdAt.toLocaleDateString("th-TH")}
                </span>
              </div>
              {existingReview.comment ? (
                <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "4px 0 0" }}>{existingReview.comment}</p>
              ) : null}
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>รีวิวถูกส่งแล้ว</p>
            </div>
          ) : (
            <ReviewForm bookingId={b.id} />
          )}
        </div>
      ) : null}

      {/* ID card photo */}
      {idCardUrl ? (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>บัตรประชาชนที่ใช้จอง</div>
          <SlipImage src={idCardUrl} contain />
        </div>
      ) : null}
    </>
  );

  return (
    <div>
      <Link href="/account/bookings" style={{ fontSize: 14, color: "var(--ink-3)" }}>
        ← การจองทั้งหมด
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 6px" }}>
        <h1 className="page-title" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {b.dress_name ?? "การจอง"}
        </h1>
        <BookingStatusBadge status={b.status} />
      </div>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 20 }}>{meta.renterHint}</p>

      {/* ── Desktop: 2-col (content | sidebar), Mobile: single col ── */}
      <div className="booking-detail-grid">
        {/* LEFT / TOP: main content */}
        <div className="booking-detail-main">
          {/* payment — surfaced at the top while waiting for payment: timer first, then QR/transfer */}
          {b.status === "waiting_for_payment" ? (
            <>
              {b.current_due_at ? <PaymentCountdown dueAt={b.current_due_at} /> : null}
              {qr ? (
                <div style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>สแกนจ่ายผ่าน PromptPay</div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>
                    ยอด ฿{total.toLocaleString()} → {b.boutique_name}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="PromptPay QR" width={240} height={240} style={{ borderRadius: 8, display: "block", margin: "0 auto" }} />
                  <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>
                    โอนแล้วกดปุ่มด้านล่างเพื่ออัปโหลดสลิป ร้านจะตรวจและยืนยันให้
                  </p>
                </div>
              ) : null}

              {showBank && (b.boutique_bank_name || b.boutique_bank_account_number) ? (
                <div style={card}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>ช่องทางโอนเงินให้ร้าน</div>
                  {b.boutique_bank_name ? (
                    <Row label="ธนาคาร" value={b.boutique_bank_name} />
                  ) : null}
                  {b.boutique_bank_account_number ? (
                    <Row label="เลขบัญชี" value={b.boutique_bank_account_number} />
                  ) : null}
                  {b.boutique_bank_account_name ? (
                    <Row label="ชื่อบัญชี" value={b.boutique_bank_account_name} />
                  ) : null}
                  <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>
                    โอนแล้วกดปุ่มด้านล่างเพื่ออัปโหลดสลิป ร้านจะตรวจและยืนยันให้
                  </p>
                </div>
              ) : null}

              {!qr && !b.boutique_bank_name && !b.boutique_bank_account_number ? (
                <div style={{ ...card, color: "var(--warn)", fontSize: 14 }}>
                  ร้านยังไม่ได้ตั้งค่าช่องทางรับชำระเงิน กรุณาติดต่อร้าน{b.boutique_line_url ? " ผ่าน LINE" : ""}เพื่อชำระเงิน
                </div>
              ) : null}
            </>
          ) : null}

          {/* details */}
          <div style={card}>
            <Row label="ร้าน" value={b.boutique_name ?? "-"} />
            {b.dress_size ? <Row label="ไซซ์" value={sizeLabel(b.dress_size)} /> : null}
            {b.items[0]?.unit_code ? (
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span className="shrink-0 text-[var(--ink-2)]">รหัสสินค้า</span>
                <span className="font-mono font-medium text-right text-[var(--ink)]">{b.items[0].unit_code}</span>
              </div>
            ) : null}
            <Row label="วันเช่า" value={fmtRentalWindow(b.start_date, b.end_date, b.start_time, b.end_time)} />
            <Row label="ส่งถึง" value={`${b.recipient_name ?? ""} · ${b.phone ?? ""}`} />
            <Row label="ที่อยู่" value={b.address_text ?? "-"} />
            {b.delivery_carrier ? <Row label="ขนส่ง" value={b.delivery_carrier} /> : null}
            {b.tracking_number ? <Row label="เลขพัสดุ" value={b.tracking_number} /> : null}
            {b.tracking_url ? (
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span className="shrink-0 text-[var(--ink-2)]">ลิงก์ติดตาม</span>
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
            {/* ── Return tracking (renter submitted) ── */}
            {b.return_shipped_at ? (
              <>
                <div className="border-t border-[var(--line)] mt-2 pt-2">
                  <span className="text-xs font-semibold text-[var(--ink-3)]">ข้อมูลการส่งคืน</span>
                </div>
                {b.return_carrier ? <Row label="ขนส่ง (ขากลับ)" value={b.return_carrier} /> : null}
                {b.return_tracking_number ? <Row label="เลขพัสดุ (ขากลับ)" value={b.return_tracking_number} /> : null}
                {b.return_tracking_url ? (
                  <div className="flex justify-between gap-4 py-1 text-sm">
                    <span className="shrink-0 text-[var(--ink-2)]">ลิงก์ติดตาม (ขากลับ)</span>
                    <a
                      href={b.return_tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-right font-medium text-[var(--accent)] underline"
                    >
                      ติดตามพัสดุ
                    </a>
                  </div>
                ) : null}
              </>
            ) : null}
            {canEditAddress ? (
              <EditAddressForm
                bookingId={b.id}
                recipientName={b.recipient_name}
                phone={b.phone}
                addressText={b.address_text}
              />
            ) : null}
            {b.status === "confirmed" ? (
              <RenterAddressChange
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
                diff={b.addr_change_diff}
                diffQrDataUrl={diffQr}
                reason={b.addr_change_reason}
              />
            ) : null}
          </div>

          <div style={card}>
            <Row label="ค่าเช่า" value={`฿${b.rental_total.toLocaleString()}`} />
            <Row label="ค่ามัดจำ" value={`฿${b.deposit.toLocaleString()}`} />
            <Row
              label="ค่าจัดส่ง"
              value={b.shipping_fee == null ? "รอร้านคำนวณ" : `฿${b.shipping_fee.toLocaleString()}`}
              muted={b.shipping_fee == null}
            />
            <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />
            <Row label="ยอดที่ต้องชำระ" value={`฿${total.toLocaleString()}`} bold />
          </div>


          {b.status === "confirmed" || b.status === "renting" || b.status === "awaiting_return" ? (
            <div style={{ ...card, background: b.status === "awaiting_return" ? "var(--warn-soft, rgba(217,119,6,0.08))" : b.status === "renting" ? "var(--info-soft, rgba(59,130,246,0.06))" : "var(--success-soft)" }}>
              <div style={{ fontWeight: 600, color: b.status === "awaiting_return" ? "var(--warn)" : b.status === "renting" ? "var(--info, #3b82f6)" : "var(--success)", marginBottom: 4 }}>
                {b.status === "awaiting_return" ? "ครบกำหนดคืนแล้ว" : b.status === "renting" ? "กำลังเช่าอยู่" : "จองเรียบร้อย"}
              </div>
              <div style={{ fontSize: 14, color: "var(--ink-2)" }}>
                {b.status === "awaiting_return"
                  ? "ครบกำหนดเช่าแล้ว กรุณาส่งชุดคืนร้านโดยเร็ว"
                  : b.status === "renting"
                  ? "คุณกำลังเช่าชุดอยู่ กรุณาส่งคืนตามกำหนด"
                  : "ร้านยืนยันการชำระเงินแล้ว รอจัดส่งชุด"}
              </div>
              {b.boutique_line_url ? (
                <a
                  href={b.boutique_line_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ marginTop: 12, display: "inline-block" }}
                >
                  มีคำถาม? ติดต่อร้าน (LINE)
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Contact shop */}
          {(b.boutique_line_url || b.boutique_instagram || b.boutique_facebook || b.boutique_twitter || b.boutique_tiktok) ? (
            <div style={card}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>ติดต่อร้านค้า</div>
              <ShopSocialLinks
                lineUrl={b.boutique_line_url}
                instagram={b.boutique_instagram}
                facebook={b.boutique_facebook}
                twitter={b.boutique_twitter}
                tiktok={b.boutique_tiktok}
              />
            </div>
          ) : null}

          {/* Slip image */}
          {slipUrl && (b.status === "payment_review" || b.status === "confirmed" || b.status === "renting" || b.status === "awaiting_return" || b.status === "returned" || b.status === "completed" || b.status === "slip_disputed") ? (
            <div style={card}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>สลิปการโอน</div>
              <SlipImage src={slipUrl} contain />
            </div>
          ) : null}

          {/* Deposit forfeited */}
          {b.refund_status === "forfeited" ? (
            <div className="rounded-xl border border-[var(--line)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4 p-4">
              <div className="font-semibold text-sm mb-3">เงินมัดจำ</div>
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span className="text-[var(--ink-2)] shrink-0">สถานะ</span>
                <span className="font-semibold text-[var(--danger)]">หักมัดจำ</span>
              </div>
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span className="text-[var(--ink-2)] shrink-0">จำนวน</span>
                <span className="font-medium">฿{b.deposit.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-3)]">ไม่ส่งคืนสินค้า -- เงินมัดจำถูกหักเต็มจำนวน</p>
            </div>
          ) : null}

          {/* Refund */}
          {(b.refund_status === "required" || b.refund_status === "refunded") ? (
            <div className="rounded-xl border border-[var(--line)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4 p-4">
              <div className="font-semibold text-sm mb-3">การคืนเงิน</div>
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span className="text-[var(--ink-2)] shrink-0">สถานะ</span>
                <span
                  className={`font-semibold ${b.refund_status === "refunded" ? "text-[var(--success)]" : "text-[var(--ink-2)]"}`}
                >
                  {b.refund_status === "refunded" ? "คืนเงินแล้ว" : "กำลังดำเนินการคืนเงิน"}
                </span>
              </div>
              {b.refund_amount ? (
                <div className="flex justify-between gap-4 py-1 text-sm">
                  <span className="text-[var(--ink-2)] shrink-0">จำนวนเงิน</span>
                  <span className="font-medium">฿{b.refund_amount.toLocaleString()}</span>
                </div>
              ) : null}
              {b.refund_note ? (
                <div className="flex justify-between gap-4 py-1 text-sm">
                  <span className="text-[var(--ink-2)] shrink-0">หมายเหตุ</span>
                  <span className="text-right text-[var(--ink-2)]">{b.refund_note}</span>
                </div>
              ) : null}
              {b.refunded_at ? (
                <div className="flex justify-between gap-4 py-1 text-sm">
                  <span className="text-[var(--ink-2)] shrink-0">โอนคืนเมื่อ</span>
                  <span className="text-right">{fmtThaiDateTime(b.refunded_at)}</span>
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

          <RenterBookingActions
            bookingId={b.id}
            status={b.status}
            canPay={b.status === "waiting_for_payment" && b.shipping_fee != null}
            disputeReason={b.cancel_reason}
            disputeNote={b.dispute_note}
            returnMethod={b.return_method}
            returnShipped={!!b.return_shipped_at}
            currentDueAt={b.current_due_at}
            depositDecision={b.deposit_decision}
            depositDisputeNote={b.deposit_dispute_note}
            refundStatus={b.refund_status}
            refundAmount={b.refund_amount}
            depositAmount={b.deposit}
            refundSlipPath={b.refund_slip_path}
            refundSlipUrl={refundSlipUrl}
          />
        </div>

        {/* RIGHT / BOTTOM: timeline + review + ID card */}
        {/* Desktop: sticky sidebar. Mobile: below actions with spacing */}
        <aside className="booking-detail-aside">
          {sideContent}
        </aside>
      </div>
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
      <span style={{ color: "var(--ink-2)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: muted ? "var(--ink-3)" : "var(--ink)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function Fallback() {
  return (
    <div style={{ paddingTop: 40, textAlign: "center" }}>
      <p style={{ fontSize: 16, color: "var(--ink-2)", marginBottom: 22 }}>ไม่พบการจองนี้</p>
      <Link href="/account/bookings" className="btn btn-dark" style={{ padding: "12px 22px" }}>
        การจองของฉัน
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

const card: React.CSSProperties = {
  padding: 16,
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "#fff",
  marginBottom: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
