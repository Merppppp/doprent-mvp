"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { uploadPrivateToR2 } from "@/lib/r2";
import type { BookingStatus } from "@/lib/types";
import {
  PLATFORM_COMMISSION_RATE,
  commissionAmount,
  dueAt,
  findTransition,
  rentalDays,
} from "@/lib/bookings";
import { FIRST_TOUCH_COOKIE, decodeAttribution } from "@/lib/attribution";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/* ----------------------------- addresses ----------------------------- */

export async function addAddress(formData: FormData): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const recipient = String(formData.get("recipient_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressText = String(formData.get("address_text") ?? "").trim();
  const makeDefault = String(formData.get("is_default") ?? "") === "on";
  if (!recipient) return { ok: false, error: "กรุณาใส่ชื่อผู้รับ" };
  if (!phone) return { ok: false, error: "กรุณาใส่เบอร์โทร" };
  if (!addressText) return { ok: false, error: "กรุณาใส่ที่อยู่จัดส่ง" };

  // First address becomes default automatically.
  const count = await db.address.count({ where: { userId: user.id } });
  const isDefault = makeDefault || count === 0;

  if (isDefault) {
    await db.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }

  const created = await db.address.create({
    data: {
      userId: user.id,
      recipientName: recipient,
      phone,
      addressText,
      isDefault,
    },
    select: { id: true },
  });

  revalidatePath("/checkout/address");
  return { ok: true, id: created.id };
}

/* ------------------------------ booking ------------------------------ */

export async function createBooking(formData: FormData): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const dressId = String(formData.get("dress_id") ?? "");
  const addressId = String(formData.get("address_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  if (!dressId || !addressId || !startDate || !endDate)
    return { ok: false, error: "ข้อมูลการจองไม่ครบ" };
  if (endDate < startDate) return { ok: false, error: "วันคืนชุดต้องไม่ก่อนวันรับ" };

  // anti-spam: cap pending requests per renter
  const pendingCount = await db.booking.count({
    where: { renterId: user.id, status: "booking_pending" },
  });
  if (pendingCount >= 3)
    return { ok: false, error: "มีคำขอจองที่รอร้านอยู่ 3 รายการแล้ว รอร้านตอบก่อนนะ" };

  // price snapshot from the dress (must be live + available)
  const dress = await db.dress.findUnique({
    where: { id: dressId },
    select: { id: true, boutiqueId: true, pricePerDay: true, deposit: true, status: true, available: true },
  });
  if (!dress) return { ok: false, error: "ไม่พบชุดนี้" };
  if (dress.status !== "live" || !dress.available)
    return { ok: false, error: "ชุดนี้ยังไม่เปิดให้จองในขณะนี้" };

  // address snapshot (must belong to the user)
  const addr = await db.address.findFirst({
    where: { id: addressId, userId: user.id },
    select: { id: true, recipientName: true, phone: true, addressText: true },
  });
  if (!addr) return { ok: false, error: "ไม่พบที่อยู่จัดส่ง" };

  const days = rentalDays(startDate, endDate);
  const rentalTotal = dress.pricePerDay * days;

  // First-touch channel of the renter — closes the acquisition→booking loop.
  const channel =
    decodeAttribution(cookies().get(FIRST_TOUCH_COOKIE)?.value)?.channel ?? null;

  const created = await db.booking.create({
    data: {
      renterId: user.id,
      boutiqueId: dress.boutiqueId,
      dressId: dress.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rentalTotal,
      deposit: dress.deposit || 0,
      commissionRate: PLATFORM_COMMISSION_RATE,
      commissionAmount: commissionAmount(rentalTotal),
      channel,
      status: "booking_pending",
      addressId: addr.id,
      recipientName: addr.recipientName,
      phone: addr.phone,
      addressText: addr.addressText,
    },
    select: { id: true },
  });

  revalidatePath("/account/bookings");
  return { ok: true, id: created.id };
}

/** Load a booking + the boutique owner so we can check roles (no RLS in Postgres). */
async function loadBooking(bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      renterId: true,
      boutiqueId: true,
      status: true,
      boutique: { select: { ownerId: true } },
    },
  });
}

/* ------------------------------ seller ------------------------------- */

export async function acceptBooking(bookingId: string, shippingFee: number): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.boutique?.ownerId !== user.id)
    return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (!Number.isFinite(shippingFee) || shippingFee < 0)
    return { ok: false, error: "ค่าจัดส่งไม่ถูกต้อง" };
  if (!findTransition(booking.status as BookingStatus, "waiting_for_payment", "seller"))
    return { ok: false, error: "สถานะไม่ถูกต้องสำหรับการรับจอง" };

  // Atomic transition guard: only flips if still in the expected source status.
  const res = await db.booking.updateMany({
    where: { id: bookingId, status: "booking_pending" },
    data: {
      shippingFee: Math.round(shippingFee),
      status: "waiting_for_payment",
      currentDueAt: new Date(dueAt()),
    },
  });
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  revalidatePath("/sell/bookings");
  revalidatePath("/account/bookings");
  return { ok: true };
}

export async function rejectBooking(bookingId: string): Promise<Result> {
  return sellerSimpleMove(bookingId, "rejected");
}

export async function confirmSlip(bookingId: string): Promise<Result> {
  return sellerSimpleMove(bookingId, "confirmed");
}

export async function disputeSlip(bookingId: string, reason: string): Promise<Result> {
  return sellerSimpleMove(bookingId, "slip_disputed", reason);
}

async function sellerSimpleMove(
  bookingId: string,
  to: BookingStatus,
  reason?: string
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.boutique?.ownerId !== user.id)
    return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  const from = booking.status as BookingStatus;
  if (!findTransition(from, to, "seller"))
    return { ok: false, error: "เปลี่ยนสถานะนี้ไม่ได้" };

  const res = await db.booking.updateMany({
    where: { id: bookingId, status: from },
    data: {
      status: to,
      ...(reason !== undefined ? { cancelReason: reason, cancelFromStatus: from } : {}),
    },
  });
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  revalidatePath("/sell/bookings");
  revalidatePath("/account/bookings");
  return { ok: true };
}

/* ------------------------------ renter ------------------------------- */

// Slip upload validation (magic bytes + size), mirrors /api/upload.
const MAX_SLIP_SIZE = 5 * 1024 * 1024;
const SLIP_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detectSlipMime(buf: Buffer): string | null {
  for (const sig of SLIP_SIGNATURES) {
    if (sig.bytes.every((b, i) => buf[i] === b)) {
      if (sig.mime === "image/webp") {
        const webp = buf.subarray(8, 12);
        if (![0x57, 0x45, 0x42, 0x50].every((b, i) => webp[i] === b)) continue;
      }
      return sig.mime;
    }
  }
  return null;
}

/**
 * Uploads the PromptPay slip to R2 and flips the booking to payment_review.
 * Server-side upload (no Supabase Storage): validates the file, stores it under
 * an unguessable key, then advances the status under an atomic guard.
 */
export async function uploadSlip(bookingId: string, formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (!findTransition(booking.status as BookingStatus, "payment_review", "renter"))
    return { ok: false, error: "ยังชำระเงินในขั้นตอนนี้ไม่ได้" };

  const file = formData.get("slip");
  if (!file || typeof file === "string") return { ok: false, error: "ยังไม่ได้เลือกไฟล์สลิป" };
  if (file.size > MAX_SLIP_SIZE) return { ok: false, error: "ไฟล์ใหญ่เกิน 5MB" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = detectSlipMime(buffer);
  if (!mime) return { ok: false, error: "ไฟล์ต้องเป็นรูปภาพ (JPG/PNG/WebP)" };
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];

  // Private upload: store the KEY (not a public URL). Slips live in a private
  // bucket and are shown only via short-lived presigned URLs to authorized parties.
  const key = `slips/${bookingId}/${randomUUID()}.${ext}`;
  try {
    await uploadPrivateToR2(key, buffer, mime);
  } catch (e) {
    console.error("[doprent] slip upload error", e);
    return { ok: false, error: "อัปโหลดสลิปไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  const res = await db.booking.updateMany({
    where: { id: bookingId, status: "waiting_for_payment", renterId: user.id },
    data: { slipPath: key, status: "payment_review" },
  });
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์ยกเลิกการจองนี้" };
  const from = booking.status as BookingStatus;
  if (!findTransition(from, "cancelled", "renter"))
    return { ok: false, error: "ยกเลิกในขั้นตอนนี้ไม่ได้ ติดต่อร้านผ่านแอดมิน" };

  const res = await db.booking.updateMany({
    where: { id: bookingId, status: from, renterId: user.id },
    data: { status: "cancelled" },
  });
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}
