import type { Booking, BookingStatus } from "@/lib/types";

/** Hours a renter has to pay (deposit + shipping) after the seller accepts.
 *  Past this window the booking forfeits its hold and the reserved unit is
 *  released back to stock. Enforced lazily by expireOverdueBookings()
 *  (lib/booking-expiry.ts) on the booking list pages and via
 *  POST /api/cron/expire-payments for scheduled sweeps. */
export const PAYMENT_WINDOW_HOURS = 3;

/** Days a booking may sit in `returned` (seller received the dress back, deposit
 *  not yet settled) before the system auto-closes it to `completed`. A safety
 *  net so deposits/records don't sit in limbo if the seller forgets to close.
 *  Overridable via env. Enforced by expireOverdueBookings() (lib/booking-expiry.ts). */
export const AUTO_COMPLETE_AFTER_RETURN_DAYS = (() => {
  const raw = Number(process.env.AUTO_COMPLETE_AFTER_RETURN_DAYS);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 7;
})();

/** Hours of shop-OPEN time that may elapse after a renter uploads their payment
 *  slip (booking enters `payment_review`) before the seller sees a red "ด่วน"
 *  escalation badge. Counts only hours the shop is actually open per its configured
 *  weekly schedule — the timer pauses while the shop is closed. Overridable via env. */
export const PAYMENT_REVIEW_ESCALATE_OPEN_HOURS = (() => {
  const raw = Number(process.env.PAYMENT_REVIEW_ESCALATE_OPEN_HOURS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 4;
})();

/**
 * Platform commission rate applied to rental_total. Overridable via env so the
 * business can tune it without a deploy. Snapshotted onto each booking at
 * create time (bookings.commission_rate/amount) so historical revenue is stable.
 */
export const PLATFORM_COMMISSION_RATE = (() => {
  const raw = Number(process.env.PLATFORM_COMMISSION_RATE);
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.1;
})();

/** Commission amount (THB, rounded) the platform earns on a rental subtotal. */
export function commissionAmount(rentalTotal: number, rate = PLATFORM_COMMISSION_RATE): number {
  return Math.round((Number(rentalTotal) || 0) * rate);
}

type Tone = "neutral" | "info" | "warn" | "success" | "danger";

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; tone: Tone; terminal: boolean; renterHint: string; sellerHint: string }
> = {
  booking_pending: {
    label: "รอร้านรับจอง",
    tone: "info",
    terminal: false,
    renterHint: "ส่งคำขอแล้ว รอร้านคิดค่าส่งและรับจอง",
    sellerHint: "คำขอจองใหม่ ใส่ค่าจัดส่งแล้วกดรับจอง",
  },
  waiting_for_payment: {
    label: "รอชำระเงิน",
    tone: "warn",
    terminal: false,
    renterHint: "สแกน QR PromptPay จ่ายแล้วอัปโหลดสลิป",
    sellerHint: "รับจองแล้ว รอลูกค้าโอนและอัปสลิป",
  },
  payment_review: {
    label: "รอร้านตรวจสลิป",
    tone: "info",
    terminal: false,
    renterHint: "อัปสลิปแล้ว รอร้านยืนยัน",
    sellerHint: "ลูกค้าอัปสลิปแล้ว ตรวจแล้วกดยืนยัน",
  },
  confirmed: {
    label: "ยืนยันแล้ว",
    tone: "success",
    terminal: false,
    renterHint: "ร้านยืนยันการชำระเงินแล้ว รอจัดส่งชุด",
    sellerHint: "ยืนยันแล้ว จัดส่งชุดตามที่อยู่ลูกค้า",
  },
  renting: {
    label: "กำลังเช่า",
    tone: "info",
    terminal: false,
    renterHint: "คุณกำลังเช่าชุดอยู่ ส่งคืนตามกำหนด",
    sellerHint: "ลูกค้ากำลังเช่าชุดอยู่ รอรับคืนเมื่อครบกำหนด",
  },
  awaiting_return: {
    label: "รอคืนของ",
    tone: "warn",
    terminal: false,
    renterHint: "ครบกำหนดเช่าแล้ว กรุณาส่งชุดคืนร้าน",
    sellerHint: "ครบกำหนดเช่าแล้ว รอรับชุดคืนจากลูกค้า เมื่อได้รับแล้วกดยืนยัน",
  },
  cancel_requested: {
    label: "รอแอดมินอนุมัติยกเลิก",
    tone: "warn",
    terminal: false,
    renterHint: "ส่งคำขอยกเลิกแล้ว รอแอดมินอนุมัติ",
    sellerHint: "ส่งคำขอยกเลิกแล้ว รอแอดมินอนุมัติ",
  },
  slip_disputed: {
    label: "สลิปมีปัญหา",
    tone: "danger",
    terminal: false,
    renterHint: "ร้านแจ้งว่าสลิปไม่ถูกต้อง อัปโหลดสลิปใหม่หรือโต้แย้งได้",
    sellerHint: "แจ้งสลิปไม่ถูกต้องแล้ว รอลูกค้าตอบกลับ",
  },
  rejected: {
    label: "ร้านปฏิเสธ",
    tone: "danger",
    terminal: true,
    renterHint: "ร้านไม่รับคำขอจองนี้",
    sellerHint: "ปฏิเสธคำขอแล้ว",
  },
  cancelled: {
    label: "ยกเลิกแล้ว",
    tone: "neutral",
    terminal: true,
    renterHint: "การจองถูกยกเลิก",
    sellerHint: "การจองถูกยกเลิก",
  },
  payment_expired: {
    label: "หมดเวลาชำระ",
    tone: "neutral",
    terminal: true,
    renterHint: "เลยกำหนดชำระเงิน การจองถูกตัด",
    sellerHint: "ลูกค้าไม่ชำระในเวลาที่กำหนด",
  },
  returned: {
    label: "รับคืนแล้ว",
    tone: "info",
    terminal: false,
    renterHint: "ร้านได้รับชุดคืนแล้ว รอร้านตรวจสอบและปิดรายการ",
    sellerHint: "รับชุดคืนแล้ว ตรวจสอบเสร็จแล้วกดปิดรายการ",
  },
  completed: {
    label: "เสร็จสิ้น",
    tone: "success",
    terminal: true,
    renterHint: "การเช่าชุดเสร็จสมบูรณ์ ขอบคุณที่ใช้บริการ",
    sellerHint: "ปิดรายการเช่าเรียบร้อย",
  },
  not_returned: {
    label: "ไม่ส่งคืนชุด",
    tone: "danger",
    terminal: true,
    renterHint: "ร้านแจ้งว่ายังไม่ได้รับชุดคืน",
    sellerHint: "ลูกค้าไม่ส่งคืนชุด — ดำเนินการเรื่องมัดจำ/คืนเงินตามนโยบายร้าน",
  },
};

export type Actor = "renter" | "seller";

type Transition = {
  from: BookingStatus;
  to: BookingStatus;
  actor: Actor;
  /** extra field that must be present for the move to be valid */
  requires?: "shipping_fee" | "slip_path";
};

/** Mirrors enforce_booking_transition() in the migration. Admin moves are
 *  unrestricted and handled server-side, so they're not listed here. */
export const TRANSITIONS: Transition[] = [
  // renter
  { from: "booking_pending", to: "cancelled", actor: "renter" },
  { from: "waiting_for_payment", to: "cancelled", actor: "renter" },
  { from: "waiting_for_payment", to: "payment_review", actor: "renter", requires: "slip_path" },
  { from: "slip_disputed", to: "payment_review", actor: "renter", requires: "slip_path" },
  // renter cancel-after-payment (→ cancel_requested; requires admin approval).
  // Once the rental has started (renting) it can no longer be cancelled — the
  // dress is already out, so it must run to return/completion.
  { from: "payment_review", to: "cancel_requested", actor: "renter" },
  { from: "confirmed", to: "cancel_requested", actor: "renter" },
  // seller
  { from: "booking_pending", to: "waiting_for_payment", actor: "seller", requires: "shipping_fee" },
  { from: "booking_pending", to: "rejected", actor: "seller" },
  { from: "payment_review", to: "confirmed", actor: "seller" },
  { from: "payment_review", to: "slip_disputed", actor: "seller" },
  { from: "payment_review", to: "cancel_requested", actor: "seller" },
  { from: "confirmed", to: "cancel_requested", actor: "seller" },
  { from: "confirmed", to: "renting", actor: "seller" },
  { from: "renting", to: "returned", actor: "seller" },
  { from: "renting", to: "completed", actor: "seller" },
  { from: "renting", to: "not_returned", actor: "seller" },
  // awaiting_return is reached automatically (sweep) at the rental's last day;
  // from there the seller confirms the physical return or escalates a cancel.
  { from: "awaiting_return", to: "returned", actor: "seller" },
  { from: "awaiting_return", to: "completed", actor: "seller" },
  { from: "awaiting_return", to: "not_returned", actor: "seller" },
  { from: "awaiting_return", to: "cancel_requested", actor: "seller" },
  { from: "returned", to: "completed", actor: "seller" },
];

export function findTransition(
  from: BookingStatus,
  to: BookingStatus,
  actor: Actor
): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.to === to && t.actor === actor);
}

/** Statuses that occupy the dress's dates (used to derive unavailable dates). */
export const ACTIVE_STATUSES: BookingStatus[] = [
  "booking_pending",
  "waiting_for_payment",
  "payment_review",
  "confirmed",
  "renting",
  "awaiting_return",
];

export function isActive(status: BookingStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Total the renter must pay once the seller has set the shipping fee. */
export function amountDue(b: Pick<Booking, "rental_total" | "deposit" | "shipping_fee">): number {
  return b.rental_total + b.deposit + (b.shipping_fee ?? 0);
}

export function dueAt(from: Date = new Date()): string {
  return new Date(from.getTime() + PAYMENT_WINDOW_HOURS * 3600 * 1000).toISOString();
}

/** Inclusive day count between two YYYY-MM-DD dates (>= 1). */
export function rentalDays(startDate: string, endDate: string): number {
  const s = new Date(startDate + "T00:00:00Z").getTime();
  const e = new Date(endDate + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((e - s) / (24 * 3600 * 1000)) + 1);
}
