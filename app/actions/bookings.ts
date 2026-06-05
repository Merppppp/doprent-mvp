"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";
import { dueAt, findTransition, rentalDays } from "@/lib/bookings";
import { normalizeTiers, priceForNights } from "@/lib/pricing";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const ISO = () => new Date().toISOString();

/* ----------------------------- addresses ----------------------------- */

export async function addAddress(formData: FormData): Promise<Result<{ id: string }>> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const recipient = String(formData.get("recipient_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressText = String(formData.get("address_text") ?? "").trim();
  const makeDefault = String(formData.get("is_default") ?? "") === "on";
  if (!recipient) return { ok: false, error: "กรุณาใส่ชื่อผู้รับ" };
  if (!phone) return { ok: false, error: "กรุณาใส่เบอร์โทร" };
  if (!addressText) return { ok: false, error: "กรุณาใส่ที่อยู่จัดส่ง" };

  // First address becomes default automatically.
  const { count } = await sb
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isDefault = makeDefault || (count ?? 0) === 0;

  if (isDefault) {
    await sb.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { data, error } = await sb
    .from("addresses")
    .insert({
      user_id: user.id,
      recipient_name: recipient,
      phone,
      address_text: addressText,
      is_default: isDefault,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "บันทึกที่อยู่ไม่สำเร็จ" };

  revalidatePath("/checkout/address");
  return { ok: true, id: data.id };
}

/* ------------------------------ booking ------------------------------ */

export async function createBooking(formData: FormData): Promise<Result<{ id: string }>> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const dressId = String(formData.get("dress_id") ?? "");
  const addressId = String(formData.get("address_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  if (!dressId || !addressId || !startDate || !endDate)
    return { ok: false, error: "ข้อมูลการจองไม่ครบ" };
  if (endDate < startDate) return { ok: false, error: "วันคืนชุดต้องไม่ก่อนวันรับ" };

  // anti-spam: cap pending requests per renter
  const { count: pendingCount } = await sb
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("renter_id", user.id)
    .eq("status", "booking_pending");
  if ((pendingCount ?? 0) >= 3)
    return { ok: false, error: "มีคำขอจองที่รอร้านอยู่ 3 รายการแล้ว รอร้านตอบก่อนนะ" };

  // price snapshot from the dress (must be live + available)
  const { data: dress, error: dErr } = await sb
    .from("dresses")
    .select("id,boutique_id,price_per_day,price_tiers,deposit,status,available")
    .eq("id", dressId)
    .maybeSingle();
  if (dErr || !dress) return { ok: false, error: "ไม่พบชุดนี้" };
  if (dress.status !== "live" || !dress.available)
    return { ok: false, error: "ชุดนี้ยังไม่เปิดให้จองในขณะนี้" };

  // address snapshot (RLS guarantees it belongs to the user)
  const { data: addr, error: aErr } = await sb
    .from("addresses")
    .select("id,recipient_name,phone,address_text")
    .eq("id", addressId)
    .maybeSingle();
  if (aErr || !addr) return { ok: false, error: "ไม่พบที่อยู่จัดส่ง" };

  const days = rentalDays(startDate, endDate);
  const rentalTotal = priceForNights(
    normalizeTiers((dress as { price_tiers?: unknown }).price_tiers),
    Number(dress.price_per_day),
    days,
  ).total;

  const { data: created, error: insErr } = await sb
    .from("bookings")
    .insert({
      renter_id: user.id,
      boutique_id: dress.boutique_id,
      dress_id: dress.id,
      start_date: startDate,
      end_date: endDate,
      rental_total: rentalTotal,
      deposit: Number(dress.deposit) || 0,
      status: "booking_pending",
      address_id: addr.id,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      address_text: addr.address_text,
    })
    .select("id")
    .single();
  if (insErr || !created) return { ok: false, error: insErr?.message ?? "สร้างการจองไม่สำเร็จ" };

  revalidatePath("/account/bookings");
  return { ok: true, id: created.id };
}

/** Shared: load a booking + the boutique owner so we can check roles. */
async function loadBookingForActor(bookingId: string) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { sb, user: null, booking: null as null } as const;
  const { data: booking } = await sb
    .from("bookings")
    .select("id,renter_id,boutique_id,status,boutiques(owner_id)")
    .eq("id", bookingId)
    .maybeSingle();
  return { sb, user, booking } as const;
}

type LoadedBooking = {
  id: string;
  renter_id: string;
  boutique_id: string;
  status: BookingStatus;
  boutiques: { owner_id: string | null } | { owner_id: string | null }[] | null;
};

function ownerId(b: LoadedBooking): string | null {
  const bt = b.boutiques;
  if (!bt) return null;
  return Array.isArray(bt) ? (bt[0]?.owner_id ?? null) : bt.owner_id;
}

/* ------------------------------ seller ------------------------------- */

export async function acceptBooking(
  bookingId: string,
  shippingFee: number
): Promise<Result> {
  const { sb, user, booking } = await loadBookingForActor(bookingId);
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  const b = booking as unknown as LoadedBooking;
  if (ownerId(b) !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (!Number.isFinite(shippingFee) || shippingFee < 0)
    return { ok: false, error: "ค่าจัดส่งไม่ถูกต้อง" };
  if (!findTransition(b.status, "waiting_for_payment", "seller"))
    return { ok: false, error: "สถานะไม่ถูกต้องสำหรับการรับจอง" };

  const { error } = await sb
    .from("bookings")
    .update({
      shipping_fee: Math.round(shippingFee),
      status: "waiting_for_payment",
      current_due_at: dueAt(),
      updated_at: ISO(),
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };
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
  const { sb, user, booking } = await loadBookingForActor(bookingId);
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  const b = booking as unknown as LoadedBooking;
  if (ownerId(b) !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (!findTransition(b.status, to, "seller"))
    return { ok: false, error: "เปลี่ยนสถานะนี้ไม่ได้" };

  const patch: Record<string, unknown> = { status: to, updated_at: ISO() };
  if (reason !== undefined) {
    patch.cancel_reason = reason;
    patch.cancel_from_status = b.status;
  }
  const { error } = await sb.from("bookings").update(patch).eq("id", bookingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/sell/bookings");
  revalidatePath("/account/bookings");
  return { ok: true };
}

/* ------------------------------ renter ------------------------------- */

/** Called after the browser uploads the slip image to
 *  payment-slips/{bookingId}/... — flips to payment_review. */
export async function markSlipUploaded(
  bookingId: string,
  slipPath: string
): Promise<Result> {
  const { sb, user, booking } = await loadBookingForActor(bookingId);
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  const b = booking as unknown as LoadedBooking;
  if (b.renter_id !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (!slipPath) return { ok: false, error: "ยังไม่ได้อัปโหลดสลิป" };
  if (!findTransition(b.status, "payment_review", "renter"))
    return { ok: false, error: "ยังชำระเงินในขั้นตอนนี้ไม่ได้" };

  const { error } = await sb
    .from("bookings")
    .update({ slip_path: slipPath, status: "payment_review", updated_at: ISO() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}

export async function cancelBooking(bookingId: string): Promise<Result> {
  const { sb, user, booking } = await loadBookingForActor(bookingId);
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  const b = booking as unknown as LoadedBooking;
  if (b.renter_id !== user.id) return { ok: false, error: "ไม่มีสิทธิ์ยกเลิกการจองนี้" };
  if (!findTransition(b.status, "cancelled", "renter"))
    return { ok: false, error: "ยกเลิกในขั้นตอนนี้ไม่ได้ ติดต่อร้านผ่านแอดมิน" };

  const { error } = await sb
    .from("bookings")
    .update({ status: "cancelled", updated_at: ISO() })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}
