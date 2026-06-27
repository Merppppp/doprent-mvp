import Link from "next/link";
import type { Metadata } from "next";
import { getBookingForView, getBookingTimeline, getBookingEffectivePolicy } from "@/lib/booking-queries";
import { bookingShippingPlan, type ShippingLeg } from "@/lib/booking-policy";
import { privateImageUrl } from "@/lib/r2";
import { amountDue, BOOKING_STATUS_META } from "@/lib/bookings";
import { getTrustScore } from "@/lib/trust-score";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import TrustBadge from "@/components/TrustBadge";
import AdminBookingActions from "./AdminBookingActions";
import SlipImage from "@/components/SlipImage";
import { PAYMENT_CHANNEL_LABEL } from "@/lib/payments";
import { fmtRentalWindow, fmtThaiLong } from "@/lib/date-th";
import { sizeLabel } from "@/lib/types";
import CopyAddressButton from "@/components/CopyAddressButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "รายละเอียดการจอง · Admin",
  robots: { index: false, follow: false },
};

const cardCls = "mb-4 rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]";

export default async function AdminBookingDetail({ params }: { params: { id: string } }) {
  // Admin role is already enforced by app/admin/layout.tsx.
  const b = await getBookingForView(params.id);
  if (!b) return <Fallback />;

  const meta = BOOKING_STATUS_META[b.status];

  // Proxy URLs — avoids ORB/CORS issues on localhost and hides raw S3 URLs.
  const slipUrl = b.slip_path ? privateImageUrl(b.slip_path) : null;
  const refundSlipUrl = b.refund_slip_path ? privateImageUrl(b.refund_slip_path) : null;
  const idCardUrl = b.id_card_path ? privateImageUrl(b.id_card_path) : null;

  const renterTrust = await getTrustScore(b.renter_id);
  const timeline = await getBookingTimeline(b.id);

  // Shipping plan
  const shipPolicy = await getBookingEffectivePolicy(b.id);
  const shipPlan = shipPolicy
    ? bookingShippingPlan(shipPolicy, b.start_date, b.end_date, b.outbound_method, b.return_method)
    : null;

  return (
    <div className="container booking-detail-grid pt-9 pb-20">
      <div className="booking-detail-main">
        <Link href="/admin/bookings" className="text-sm text-[var(--ink-3)]">
          ← การจองทั้งหมด
        </Link>

        <div className="mt-3.5 mb-1.5 flex items-center justify-between">
          <h1 className="page-title text-2xl font-semibold tracking-tight">
            {b.dress_name ?? "การจอง"}
          </h1>
          <BookingStatusBadge status={b.status} />
        </div>
        <p className="mb-5 text-sm text-[var(--ink-2)]">
          {meta.label} · {meta.sellerHint}
        </p>

        {/* ── Booking info ── */}
        <div className={cardCls}>
          <Row label="รหัสการจอง" value={b.id} mono />
          {b.dress_size ? <Row label="ไซซ์" value={sizeLabel(b.dress_size)} /> : null}
          {b.items[0]?.unit_code ? <Row label="รหัสสินค้า" value={b.items[0].unit_code} mono /> : null}
          <Row label="วันเช่า" value={fmtRentalWindow(b.start_date, b.end_date, b.start_time, b.end_time)} />
          <div className="flex justify-between gap-4 py-1 text-sm">
            <span className="shrink-0 text-[var(--ink-2)]">ผู้เช่า / ผู้รับ</span>
            <span className="flex flex-wrap items-center justify-end gap-1.5 text-right font-medium">
              {b.recipient_name ?? ""}
              {b.phone ? ` · ${b.phone}` : ""}
              <TrustBadge score={renterTrust} style={{ marginLeft: 2 }} />
            </span>
          </div>
          <div className="flex justify-between gap-2 py-1 text-sm">
            <span className="shrink-0 text-[var(--ink-2)]">ที่อยู่จัดส่ง</span>
            <span className="flex items-start gap-1 text-right">
              <span className="font-medium">{b.address_text ?? "-"}</span>
              <CopyAddressButton recipientName={b.recipient_name} phone={b.phone} address={b.address_text} />
            </span>
          </div>
          <Row label="ร้าน" value={b.boutique_name ?? "-"} />
          {b.current_due_at ? <Row label="ครบกำหนดชำระ" value={fmtThaiDateTime(b.current_due_at)} /> : null}
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

          {/* Return tracking */}
          {b.return_shipped_at ? (
            <>
              <div className="border-t border-[var(--line)] mt-2 pt-2">
                <span className="text-xs font-semibold text-[var(--ink-3)]">ข้อมูลการส่งคืน (จากลูกค้า)</span>
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
        </div>

        {/* ── Shipping plan ── */}
        {shipPlan ? (
          <div className={cardCls}>
            <div className="mb-1 text-sm font-semibold">การจัดส่ง</div>
            <ShippingLegRow
              title="ขาไป — ร้านส่งให้ลูกค้า"
              leg={shipPlan.outbound}
              when={
                shipPlan.outbound.sameDay
                  ? `ส่งวันรับชุด ${fmtThaiLong(b.start_date)} — ส่งด่วน ให้ถึงภายในวันเดียว`
                  : `เริ่มจัดส่งภายใน ${fmtThaiLong(shipPlan.outbound.shipBy)} — เผื่อเวลาขนส่ง ${shipPlan.outbound.transitDays} วัน ให้ถึงวันรับชุด (${fmtThaiLong(b.start_date)})`
              }
            />
            <ShippingLegRow
              title="ขากลับ — ลูกค้าส่งคืนร้าน"
              leg={shipPlan.return}
              when={
                shipPlan.return.sameDay
                  ? `ลูกค้าส่งคืนวันสิ้นสุดเช่า ${fmtThaiLong(b.end_date)} — ส่งด่วน ถึงร้านภายในวัน`
                  : `ลูกค้าส่งคืนวันสิ้นสุดเช่า ${fmtThaiLong(b.end_date)} — ส่งพัสดุ ถึงร้านภายใน ${shipPlan.return.transitDays} วัน`
              }
            />
          </div>
        ) : null}

        {/* ── Cost breakdown ── */}
        <div className={cardCls}>
          <Row label="ค่าเช่า" value={`฿${b.rental_total.toLocaleString()}`} />
          <Row label="ค่ามัดจำ" value={`฿${b.deposit.toLocaleString()}`} />
          <Row
            label="ค่าจัดส่ง"
            value={b.shipping_fee == null ? "ยังไม่กำหนด" : `฿${b.shipping_fee.toLocaleString()}`}
            muted={b.shipping_fee == null}
          />
          {b.commission_amount != null ? (
            <Row label="ค่าคอมมิชชัน" value={`฿${b.commission_amount.toLocaleString()}`} />
          ) : null}
          <div className="my-2 border-t border-[var(--line)]" />
          <Row label="ยอดที่ลูกค้าจ่าย" value={`฿${amountDue(b).toLocaleString()}`} bold />
          {b.payment_method ? (
            <Row label="เก็บเงินผ่าน" value={PAYMENT_CHANNEL_LABEL[b.payment_method]} />
          ) : null}
          {b.boutique_promptpay_id ? <Row label="PromptPay ร้าน" value={b.boutique_promptpay_id} /> : null}
        </div>

        {/* ── Cancel reason ── */}
        {b.cancel_reason && REASON_VISIBLE_STATUSES.has(b.status) ? (
          <div className={`${cardCls} text-sm text-[var(--ink-2)]`}>
            <b>เหตุผล:</b> {b.cancel_reason}
            {b.cancel_from_status ? (
              <div className="mt-1 text-xs text-[var(--ink-3)]">
                สถานะก่อนหน้า: {BOOKING_STATUS_META[b.cancel_from_status as import("@/lib/types").BookingStatus]?.label ?? b.cancel_from_status}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Dispute note ── */}
        {b.dispute_note ? (
          <div className={`${cardCls} border-[var(--info)] bg-[var(--info-soft)] text-sm text-[var(--ink-2)]`}>
            <b>ข้อความโต้แย้งจากผู้เช่า:</b> {b.dispute_note}
          </div>
        ) : null}

        {/* ── Return condition ── */}
        {b.return_condition ? (
          <div className={cardCls}>
            <div className="font-semibold text-sm mb-2">สภาพการรับคืน</div>
            <div className="flex justify-between gap-4 py-1 text-sm">
              <span className="text-[var(--ink-2)] shrink-0">ผลการตรวจรับ</span>
              <span
                className={`font-semibold ${
                  b.return_condition === "complete" ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}
              >
                {b.return_condition === "complete"
                  ? "คืนของแบบสมบูรณ์"
                  : b.return_condition === "damaged"
                    ? "มีความเสียหาย"
                    : "ลูกค้าไม่ส่งคืนของ"}
              </span>
            </div>
            {b.return_condition === "damaged" && b.return_damage_note ? (
              <div className="mt-2 text-sm text-[var(--ink-2)] whitespace-pre-wrap">
                <span className="text-[var(--ink-3)]">ความเสียหายที่พบ: </span>
                {b.return_damage_note}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Refund / deposit status ── */}
        {b.refund_status === "forfeited" ? (
          <div className={cardCls}>
            <div className="font-semibold text-sm mb-2">เงินมัดจำ</div>
            <div className="flex justify-between gap-4 py-1 text-sm">
              <span className="text-[var(--ink-2)] shrink-0">สถานะ</span>
              <span className="font-semibold text-[var(--danger)]">หักมัดจำ</span>
            </div>
            <div className="flex justify-between gap-4 py-1 text-sm">
              <span className="text-[var(--ink-2)] shrink-0">จำนวน</span>
              <span className="font-medium">฿{b.deposit.toLocaleString()}</span>
            </div>
          </div>
        ) : (b.refund_status === "required" || b.refund_status === "refunded") ? (
          <div className={cardCls}>
            <div className="font-semibold text-sm mb-2">การคืนเงิน</div>
            <div className="flex justify-between gap-4 py-1 text-sm">
              <span className="text-[var(--ink-2)] shrink-0">สถานะ</span>
              <span className={`font-semibold ${b.refund_status === "refunded" ? "text-[var(--success)]" : "text-[var(--ink-2)]"}`}>
                {b.refund_status === "refunded" ? "คืนเงินแล้ว" : "กำลังดำเนินการคืนเงิน"}
              </span>
            </div>
            {b.refund_amount ? (
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span className="text-[var(--ink-2)] shrink-0">จำนวน</span>
                <span className="font-medium">฿{b.refund_amount.toLocaleString()}</span>
              </div>
            ) : null}
            {b.refund_note ? <Row label="หมายเหตุ" value={b.refund_note} /> : null}
            {refundSlipUrl && b.refund_status === "refunded" ? (
              <div className="mt-3">
                <div className="text-xs text-[var(--ink-3)] mb-2">สลิปยืนยันการคืนเงิน</div>
                <SlipImage src={refundSlipUrl} contain />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Admin Actions ── */}
        <AdminBookingActions bookingId={b.id} status={b.status} refundStatus={b.refund_status ?? null} disputeNote={b.dispute_note ?? null} currentDueAt={b.current_due_at ?? null} />
      </div>

      {/* ── Aside: timeline + slip + ID card ── */}
      <aside className="booking-detail-aside">
        {timeline.length > 0 ? (
          <div className={cardCls}>
            <div className="mb-3 text-[15px] font-semibold">ประวัติการจอง</div>
            <div className="flex flex-col">
              <TimelineRow label="สร้างการจอง" at={b.created_at} isFirst />
              {timeline.map((ev, i) => (
                <TimelineRow key={i} label={ev.label} at={ev.at} note={ev.note} isLast={i === timeline.length - 1} />
              ))}
            </div>
          </div>
        ) : null}

        {slipUrl ? (
          <div className={cardCls}>
            <div className="mb-2 text-sm font-semibold">สลิปการโอน</div>
            <SlipImage src={slipUrl} />
          </div>
        ) : null}

        {idCardUrl ? (
          <div className={cardCls}>
            <div className="mb-2 text-sm font-semibold">บัตรประชาชน</div>
            <SlipImage src={idCardUrl} contain />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-[var(--ink-2)]">{label}</span>
      <span className={`text-right ${bold ? "font-bold" : "font-medium"} ${muted ? "text-[var(--ink-3)]" : ""} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function ShippingLegRow({ title, leg, when }: { title: string; leg: ShippingLeg; when: string }) {
  const express = leg.method === "express";
  return (
    <div className="border-t border-[var(--line)] py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold">{title}</span>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            express
              ? "border-blue-500/35 bg-blue-500/10 text-[var(--accent)]"
              : "border-[var(--line)] bg-[var(--bg-hover,rgba(0,0,0,0.04))] text-[var(--ink-2)]"
          }`}
        >
          {express ? "ส่งด่วน" : "ส่งพัสดุ"}
        </span>
      </div>
      <div className="mt-0.5 text-xs leading-relaxed text-[var(--ink-3)]">{when}</div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="container max-w-[520px] pb-24 pt-20 text-center">
      <p className="mb-5 text-base text-[var(--ink-2)]">ไม่พบการจองนี้</p>
      <Link href="/admin/bookings" className="btn btn-dark px-5 py-3">
        การจองทั้งหมด
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
    <div className="flex min-h-9 gap-3">
      <div className="flex w-3.5 flex-col items-center">
        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
            isLast ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--ink-3)] bg-[var(--ink-3)]"
          }`}
        />
        {!isLast && <div className="my-0.5 w-0.5 flex-1 bg-[var(--line)]" />}
      </div>
      <div className={isLast ? "" : "pb-2"}>
        <div className={`text-[13px] font-medium ${isLast ? "" : "text-[var(--ink-2)]"}`}>{label}</div>
        <div className="text-[11.5px] text-[var(--ink-3)]">{fmtThaiDateTime(at)}</div>
        {note ? <div className="mt-0.5 text-[11.5px] text-[var(--ink-3)]">เหตุผล: {note}</div> : null}
      </div>
    </div>
  );
}

const REASON_VISIBLE_STATUSES = new Set([
  "cancel_requested",
  "cancelled",
  "rejected",
  "slip_disputed",
  "payment_expired",
]);
