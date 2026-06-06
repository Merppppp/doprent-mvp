import type { Booking, BookingStatus } from "@/lib/types";

/** Hours a renter has to pay after the seller accepts (Phase 2 cron enforces). */
export const PAYMENT_WINDOW_HOURS = 24;

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
    terminal: true,
    renterHint: "ร้านยืนยันการชำระเงินแล้ว นัดรับ/ส่งชุดกับร้านได้เลย",
    sellerHint: "ยืนยันแล้ว จัดส่งชุดตามที่อยู่ลูกค้า",
  },
  cancel_requested: {
    label: "ร้านขอยกเลิก (รอแอดมิน)",
    tone: "warn",
    terminal: false,
    renterHint: "ร้านขอยกเลิก แอดมินกำลังตรวจสอบ",
    sellerHint: "ส่งคำขอยกเลิกให้แอดมินแล้ว",
  },
  slip_disputed: {
    label: "สลิปมีปัญหา (รอแอดมิน)",
    tone: "danger",
    terminal: false,
    renterHint: "ร้านแจ้งว่าสลิปไม่ถูกต้อง แอดมินกำลังตรวจสอบ",
    sellerHint: "แจ้งสลิปไม่ถูกต้องแล้ว รอแอดมิน",
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
  // seller
  { from: "booking_pending", to: "waiting_for_payment", actor: "seller", requires: "shipping_fee" },
  { from: "booking_pending", to: "rejected", actor: "seller" },
  { from: "payment_review", to: "confirmed", actor: "seller" },
  { from: "payment_review", to: "slip_disputed", actor: "seller" },
  { from: "payment_review", to: "cancel_requested", actor: "seller" },
  { from: "confirmed", to: "cancel_requested", actor: "seller" },
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
