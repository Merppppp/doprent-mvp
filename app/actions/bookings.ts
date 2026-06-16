"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
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
import {
  resolveEffectivePolicy,
  computeUnavailableDates,
  validateBookingRange,
} from "@/lib/booking-policy";
import { normalizeTiers, priceForNights } from "@/lib/pricing";
import { resolvePaymentChannel, type PaymentChannel } from "@/lib/payments";
import {
  notifyBookingAccepted,
  notifyBookingConfirmed,
  notifyBookingRejected,
  notifyNewBookingRequest,
  notifySlipDisputed,
} from "@/lib/notifications";
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
  const label = String(formData.get("label") ?? "บ้าน").trim();
  const addressLine = String(formData.get("address_line") ?? formData.get("address_text") ?? "").trim();
  const subdistrict = String(formData.get("subdistrict") ?? "").trim() || null;
  const district = String(formData.get("district") ?? "").trim() || null;
  const province = String(formData.get("province") ?? "กรุงเทพมหานคร").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const makeDefault = String(formData.get("is_default") ?? "") === "on";
  if (!recipient) return { ok: false, error: "กรุณาใส่ชื่อผู้รับ" };
  if (!phone) return { ok: false, error: "กรุณาใส่เบอร์โทร" };
  if (!addressLine) return { ok: false, error: "กรุณาใส่ที่อยู่จัดส่ง" };

  return withActor(user.id, async () => {
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
        label,
        recipientName: recipient,
        phone,
        addressLine,
        subdistrict,
        district,
        province,
        postalCode,
        isDefault,
      },
      select: { id: true },
    });

    revalidatePath("/checkout/address");
    revalidatePath("/account/addresses");
    return { ok: true, id: created.id };
  });
}

export async function updateAddress(formData: FormData): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const id = String(formData.get("id") ?? "").trim();
  const recipient = String(formData.get("recipient_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressLine = String(formData.get("address_line") ?? formData.get("address_text") ?? "").trim();
  if (!id) return { ok: false, error: "ไม่พบที่อยู่" };
  if (!recipient) return { ok: false, error: "กรุณาใส่ชื่อผู้รับ" };
  if (!phone) return { ok: false, error: "กรุณาใส่เบอร์โทร" };
  if (!addressLine) return { ok: false, error: "กรุณาใส่ที่อยู่จัดส่ง" };

  return withActor(user.id, async () => {
    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "ไม่พบที่อยู่" };

    await db.address.update({
      where: { id },
      data: { recipientName: recipient, phone, addressLine },
    });

    revalidatePath("/checkout/address");
    revalidatePath("/account/addresses");
    return { ok: true, id };
  });
}

export async function deleteAddress(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "ไม่พบที่อยู่" };

  return withActor(user.id, async () => {
    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
      select: { id: true, isDefault: true },
    });
    if (!existing) return { ok: false, error: "ไม่พบที่อยู่" };

    await db.address.delete({ where: { id } });

    // If we removed the default, promote the most-recent remaining address.
    if (existing.isDefault) {
      const next = await db.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) {
        await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    revalidatePath("/checkout/address");
    revalidatePath("/account/addresses");
    return { ok: true };
  });
}

export async function setDefaultAddress(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "ไม่พบที่อยู่" };

  return withActor(user.id, async () => {
    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "ไม่พบที่อยู่" };

    await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await db.address.update({ where: { id }, data: { isDefault: true } });

    revalidatePath("/checkout/address");
    revalidatePath("/account/addresses");
    return { ok: true };
  });
}

/* ------------------------------ booking ------------------------------ */

/** Active booking statuses for overlap counting — must stay in sync with ACTIVE_STATUSES in lib/booking-policy.ts */
const ACTIVE_BOOKING_STATUSES = ["booking_pending", "waiting_for_payment", "payment_review", "confirmed"] as const;

/** Add `days` calendar days to a YYYY-MM-DD string (UTC). Mirrors the helper in booking-policy.ts. */
function addDaysLocal(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Enumerate all YYYY-MM-DD strings in [start, end] inclusive (UTC). */
function dateRangeLocal(start: string, end: string): string[] {
  const result: string[] = [];
  let cur = start;
  while (cur <= end) {
    result.push(cur);
    cur = addDaysLocal(cur, 1);
  }
  return result;
}

export async function createBooking(formData: FormData): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  // `dress_id` accepted as a legacy alias during the rename deploy window.
  const productId = String(formData.get("product_id") ?? formData.get("dress_id") ?? "");
  const addressId = String(formData.get("address_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  // variantId is optional — new bookings send it; legacy back-compat: null
  const variantIdRaw = String(formData.get("variant_id") ?? "").trim() || null;
  if (!productId || !addressId || !startDate || !endDate)
    return { ok: false, error: "ข้อมูลการจองไม่ครบ" };
  if (endDate < startDate) return { ok: false, error: "วันคืนชุดต้องไม่ก่อนวันรับ" };

  return withActor(user.id, async () => {
    // anti-spam: cap pending requests per renter
    const pendingCount = await db.booking.count({
      where: { renterId: user.id, status: "booking_pending" },
    });
    if (pendingCount >= 3)
      return { ok: false, error: "มีคำขอจองที่รอร้านอยู่ 3 รายการแล้ว รอร้านตอบก่อนนะ" };

    // price + policy snapshot from the product (must be live + available)
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        shopId: true,
        pricePerDay: true,
        priceTiers: {
          orderBy: { minDays: "asc" },
          select: { minDays: true, pricePerDay: true },
        },
        deposit: true,
        status: true,
        available: true,
        // policy override columns
        policyOverride: true,
        leadTimeDays: true,
        minRentalDays: true,
        maxRentalDays: true,
        returnWindowDays: true,
        bufferDaysAfter: true,
        shop: {
          select: {
            owner: { select: { email: true } },
            // shop-level policy
            leadTimeDays: true,
            minRentalDays: true,
            maxRentalDays: true,
            returnWindowDays: true,
            bufferDaysAfter: true,
            closedWeekdays: true,
            closedDates: {
              select: { date: true },
            },
          },
        },
      },
    });
    if (!product) return { ok: false, error: "ไม่พบชุดนี้" };
    if (product.status !== "live" || !product.available)
      return { ok: false, error: "ชุดนี้ยังไม่เปิดให้จองในขณะนี้" };

    // ── Variant validation ────────────────────────────────────────────────────
    // If a variantId was submitted, verify it belongs to this product and is open.
    let resolvedVariantId: string | null = variantIdRaw;
    let variantPricePerDay: number = product.pricePerDay;
    let variantDeposit: number = product.deposit;
    let variantQuantity: number = 1;

    if (resolvedVariantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: resolvedVariantId },
        select: { id: true, productId: true, pricePerDay: true, deposit: true, quantity: true, available: true },
      });
      if (!variant || variant.productId !== product.id)
        return { ok: false, error: "ไม่พบไซซ์ที่เลือก" };
      if (!variant.available)
        return { ok: false, error: "ไซซ์นี้ยังไม่เปิดให้จองในขณะนี้" };
      variantPricePerDay = variant.pricePerDay;
      variantDeposit = variant.deposit;
      variantQuantity = variant.quantity;
    }

    // address snapshot (must belong to the user)
    const addr = await db.address.findFirst({
      where: { id: addressId, userId: user.id },
      select: { id: true, recipientName: true, phone: true, addressLine: true },
    });
    if (!addr) return { ok: false, error: "ไม่พบที่อยู่จัดส่ง" };

    // ── Booking policy enforcement ─────────────────────────────────────────
    // Load active bookings + blackouts for availability check.
    // When a variantId is given: filter active bookings to that variant (plus
    // legacy null-variant bookings for this product — they hold "some size").
    // When no variantId (legacy): load all product-level bookings.
    const [activeBookings, blackouts] = await Promise.all([
      resolvedVariantId
        ? db.booking.findMany({
            where: {
              productId: product.id,
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
              // Include bookings for THIS variant OR legacy bookings (null variantId)
              OR: [
                { variantId: resolvedVariantId },
                { variantId: null },
              ],
            },
            select: { startDate: true, endDate: true, status: true },
          })
        : db.booking.findMany({
            where: {
              productId: product.id,
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
            },
            select: { startDate: true, endDate: true, status: true },
          }),
      db.productBlackoutDate.findMany({
        where: { productId: product.id },
        select: { date: true },
      }),
    ]);

    const effectivePolicy = resolveEffectivePolicy(
      {
        leadTimeDays: product.shop.leadTimeDays,
        minRentalDays: product.shop.minRentalDays,
        maxRentalDays: product.shop.maxRentalDays,
        returnWindowDays: product.shop.returnWindowDays,
        bufferDaysAfter: product.shop.bufferDaysAfter,
        closedWeekdays: product.shop.closedWeekdays,
      },
      {
        policyOverride: product.policyOverride,
        leadTimeDays: product.leadTimeDays,
        minRentalDays: product.minRentalDays,
        maxRentalDays: product.maxRentalDays,
        returnWindowDays: product.returnWindowDays,
        bufferDaysAfter: product.bufferDaysAfter,
      },
    );

    // Scan window: start..end (no need to scan further for server validation)
    const unavailableDates = computeUnavailableDates({
      blackouts: blackouts.map((b) => b.date.toISOString().slice(0, 10)),
      shopClosedDates: product.shop.closedDates.map((d) => d.date.toISOString().slice(0, 10)),
      bookings: activeBookings.map((b) => ({
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
      })),
      effectivePolicy,
      rangeStart: startDate,
      rangeEnd: endDate,
      quantity: variantQuantity,
    });

    const today = new Date().toISOString().slice(0, 10);
    const policyCheck = validateBookingRange({
      startDate,
      endDate,
      effectivePolicy,
      unavailableDates,
      today,
    });
    if (!policyCheck.ok) return { ok: false, error: policyCheck.error };
    // ── End policy enforcement ─────────────────────────────────────────────

    const days = rentalDays(startDate, endDate);
    const tiers = normalizeTiers(
      product.priceTiers.map((t, i) => ({
        min: t.minDays,
        max: i < product.priceTiers.length - 1 ? product.priceTiers[i + 1].minDays - 1 : null,
        per_day: t.pricePerDay,
      })),
    );
    // Pricing: use variant price if a variant was chosen, otherwise product base price.
    // priceTiers apply on top of variantPricePerDay (variant overrides the base rate).
    const rentalTotal = priceForNights(tiers, variantPricePerDay, days).total;

    // First-touch channel of the renter — closes the acquisition→booking loop.
    const channel =
      decodeAttribution(cookies().get(FIRST_TOUCH_COOKIE)?.value)?.channel ?? null;

    // ── TX-guarded oversell prevention ───────────────────────────────────────
    // If a variant was chosen: use a transaction with SELECT FOR UPDATE on the
    // variant row (serialises concurrent attempts), then re-count overlaps, then
    // insert — the only race-safe way to prevent stock oversell.
    let createdId: string;

    if (resolvedVariantId) {
      const bufferDays = effectivePolicy.bufferDaysAfter;

      let txResult: { ok: true; id: string } | { ok: false; error: string };
      try {
        txResult = await db.$transaction(async (tx) => {
          // Lock the variant row to serialize concurrent booking attempts for the same variant.
          await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${resolvedVariantId}::uuid FOR UPDATE`;

          // Re-count overlapping active bookings (variant + legacy null-variant).
          const overlapBookings = await tx.booking.findMany({
            where: {
              status: { in: [...ACTIVE_BOOKING_STATUSES] },
              OR: [
                { variantId: resolvedVariantId },
                { variantId: null, productId: product.id },
              ],
              startDate: { lte: new Date(endDate) },
              endDate: { gte: new Date(startDate) },
            },
            select: { startDate: true, endDate: true },
          });

          // Count concurrent bookings per calendar day (including buffer after each).
          const dayCount = new Map<string, number>();
          for (const b of overlapBookings) {
            const bStart = b.startDate.toISOString().slice(0, 10);
            const bEnd = addDaysLocal(b.endDate.toISOString().slice(0, 10), bufferDays);
            for (const d of dateRangeLocal(bStart, bEnd)) {
              dayCount.set(d, (dayCount.get(d) ?? 0) + 1);
            }
          }

          // Reject if any day in the requested range is at or above stock capacity.
          for (const d of dateRangeLocal(startDate, endDate)) {
            if ((dayCount.get(d) ?? 0) >= variantQuantity) {
              const [, m, day] = d.split("-");
              return { ok: false as const, error: `ไซซ์นี้เต็มในวันที่ ${parseInt(day ?? "0")}/${parseInt(m ?? "0")} กรุณาเลือกวันอื่น` };
            }
          }

          const row = await tx.booking.create({
            data: {
              renterId: user.id,
              shopId: product.shopId,
              productId: product.id,
              variantId: resolvedVariantId,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              rentalTotal,
              deposit: variantDeposit,
              commissionRate: PLATFORM_COMMISSION_RATE,
              commissionAmount: commissionAmount(rentalTotal),
              channel,
              status: "booking_pending",
              addressId: addr.id,
              recipientName: addr.recipientName,
              phone: addr.phone,
              addressText: addr.addressLine,
            },
            select: { id: true },
          });
          return { ok: true as const, id: row.id };
        });
      } catch (e) {
        console.error("[doprent] createBooking tx error", e);
        return { ok: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
      }

      if (!txResult.ok) return txResult;
      createdId = txResult.id;
    } else {
      // Legacy path (no variant): simple insert.
      const row = await db.booking.create({
        data: {
          renterId: user.id,
          shopId: product.shopId,
          productId: product.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          rentalTotal,
          deposit: variantDeposit,
          commissionRate: PLATFORM_COMMISSION_RATE,
          commissionAmount: commissionAmount(rentalTotal),
          channel,
          status: "booking_pending",
          addressId: addr.id,
          recipientName: addr.recipientName,
          phone: addr.phone,
          addressText: addr.addressLine,
        },
        select: { id: true },
      });
      createdId = row.id;
    }

    // Fire-and-forget: notify the shop owner about the new request.
    notifyNewBookingRequest({
      sellerEmail: product.shop?.owner?.email,
      dressName: product.name,
      startDate,
      endDate,
      bookingId: createdId,
    });

    revalidatePath("/account/bookings");
    return { ok: true, id: createdId };
  });
}

/** Statuses where the renter may still edit the delivery address (pre-shipment). */
const ADDRESS_EDITABLE_STATUSES: BookingStatus[] = ["booking_pending", "waiting_for_payment"];

/**
 * Renter edits the delivery address on an in-progress booking.
 * Only allowed while the booking is still in a pre-shipment state
 * (booking_pending or waiting_for_payment).
 */
export async function editBookingAddress(
  bookingId: string,
  formData: FormData,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressText = String(formData.get("address_text") ?? "").trim();

  if (!recipientName) return { ok: false, error: "กรุณาใส่ชื่อผู้รับ" };
  if (!phone) return { ok: false, error: "กรุณาใส่เบอร์โทร" };
  if (!addressText) return { ok: false, error: "กรุณาใส่ที่อยู่จัดส่ง" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, renterId: true, status: true },
  });
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์แก้ไขการจองนี้" };
  if (!ADDRESS_EDITABLE_STATUSES.includes(booking.status as BookingStatus))
    return { ok: false, error: "ไม่สามารถแก้ไขที่อยู่ได้ในขั้นตอนนี้" };

  const res = await withActor(user.id, () =>
    db.booking.updateMany({
      where: {
        id: bookingId,
        renterId: user.id,
        status: { in: ADDRESS_EDITABLE_STATUSES },
      },
      data: { recipientName, phone, addressText },
    }),
  );
  if (res.count === 0) return { ok: false, error: "ไม่สามารถแก้ไขได้ (สถานะเปลี่ยนไปแล้ว)" };

  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath("/account/bookings");
  return { ok: true };
}

/** Load a booking + the shop owner so we can check roles (no RLS in Postgres). */
async function loadBooking(bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      renterId: true,
      shopId: true,
      status: true,
      shop: {
        select: {
          ownerId: true,
          promptpayId: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
          defaultPaymentMethod: true,
        },
      },
      renter: { select: { email: true } },
      product: { select: { name: true } },
    },
  });
}

/* ------------------------------ seller ------------------------------- */

export async function acceptBooking(
  bookingId: string,
  shippingFee: number,
  paymentMethod?: PaymentChannel | null,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.shop?.ownerId !== user.id)
    return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (!Number.isFinite(shippingFee) || shippingFee < 0)
    return { ok: false, error: "ค่าจัดส่งไม่ถูกต้อง" };
  if (!findTransition(booking.status as BookingStatus, "waiting_for_payment", "seller"))
    return { ok: false, error: "สถานะไม่ถูกต้องสำหรับการรับจอง" };

  // Snapshot which channel to collect through. With both channels configured we
  // honour the seller's pick (or fall back to the shop default); with only one
  // we force it; with none it stays null.
  const channel = resolvePaymentChannel(booking.shop ?? {}, paymentMethod);

  // Atomic transition guard: only flips if still in the expected source status.
  const res = await withActor(user.id, () =>
    db.booking.updateMany({
      where: { id: bookingId, status: "booking_pending" },
      data: {
        shippingFee: Math.round(shippingFee),
        paymentMethod: channel,
        status: "waiting_for_payment",
        currentDueAt: new Date(dueAt()),
      },
    }),
  );
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  notifyBookingAccepted({
    renterEmail: booking.renter?.email,
    dressName: booking.product?.name ?? "ชุดที่จอง",
    bookingId,
  });

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

/** Seller marks the dress as received back — transitions confirmed → returned. */
export async function markReturned(bookingId: string): Promise<Result> {
  return sellerSimpleMove(bookingId, "returned");
}

/** Seller closes the rental after inspection — transitions returned → completed. */
export async function markCompleted(bookingId: string): Promise<Result> {
  return sellerSimpleMove(bookingId, "completed");
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
  if (booking.shop?.ownerId !== user.id)
    return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  const from = booking.status as BookingStatus;
  if (!findTransition(from, to, "seller"))
    return { ok: false, error: "เปลี่ยนสถานะนี้ไม่ได้" };

  const res = await withActor(user.id, () =>
    db.booking.updateMany({
      where: { id: bookingId, status: from },
      data: {
        status: to,
        ...(reason !== undefined ? { cancelReason: reason, cancelFromStatus: from } : {}),
      },
    }),
  );
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  // Fire-and-forget renter notifications per transition.
  const renterNotify = {
    renterEmail: booking.renter?.email,
    dressName: booking.product?.name ?? "ชุดที่จอง",
    bookingId,
  };
  if (to === "rejected") notifyBookingRejected(renterNotify);
  else if (to === "confirmed") notifyBookingConfirmed(renterNotify);
  else if (to === "slip_disputed") notifySlipDisputed(renterNotify);

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

  const res = await withActor(user.id, () =>
    db.booking.updateMany({
      where: { id: bookingId, status: "waiting_for_payment", renterId: user.id },
      data: { slipPath: key, status: "payment_review" },
    }),
  );
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

  const res = await withActor(user.id, () =>
    db.booking.updateMany({
      where: { id: bookingId, status: from, renterId: user.id },
      data: { status: "cancelled" },
    }),
  );
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}

/* -------------------- post-payment address change -------------------- */

/** Load a booking with the extra addr-change fields needed for the sub-flow. */
async function loadBookingForAddrChange(bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      renterId: true,
      shopId: true,
      status: true,
      shippingFee: true,
      addrChangeStatus: true,
      pendingRecipientName: true,
      pendingPhone: true,
      pendingAddressText: true,
      pendingShippingFee: true,
      addrChangeDiff: true,
      addrChangeSlipPath: true,
      addrChangeReason: true,
      shop: { select: { ownerId: true } },
    },
  });
}

/** addr_change_status values that allow a new request from the renter. */
const ADDR_CHANGE_REQUESTABLE = [null, "none", "rejected", "done"] as const;

/**
 * Renter requests a delivery-address change on a confirmed booking.
 * Creates a pending sub-flow without touching booking.status.
 */
export async function requestAddressChange(
  bookingId: string,
  formData: FormData,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressText = String(formData.get("address_text") ?? "").trim();

  if (!recipientName) return { ok: false, error: "กรุณาใส่ชื่อผู้รับ" };
  if (!phone) return { ok: false, error: "กรุณาใส่เบอร์โทร" };
  if (!addressText) return { ok: false, error: "กรุณาใส่ที่อยู่จัดส่ง" };

  const booking = await loadBookingForAddrChange(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (booking.status !== "confirmed")
    return { ok: false, error: "สามารถขอแก้ที่อยู่ได้เฉพาะการจองที่ยืนยันแล้วเท่านั้น" };
  if (!(ADDR_CHANGE_REQUESTABLE as ReadonlyArray<string | null>).includes(booking.addrChangeStatus))
    return { ok: false, error: "มีคำขอแก้ที่อยู่อยู่แล้ว ลองรีเฟรช" };

  const res = await withActor(user.id, () =>
    db.booking.updateMany({
      where: {
        id: bookingId,
        renterId: user.id,
        status: "confirmed",
        OR: [
          { addrChangeStatus: null },
          { addrChangeStatus: "none" },
          { addrChangeStatus: "rejected" },
          { addrChangeStatus: "done" },
        ],
      },
      data: {
        addrChangeStatus: "requested",
        pendingRecipientName: recipientName,
        pendingPhone: phone,
        pendingAddressText: addressText,
        pendingShippingFee: null,
        addrChangeDiff: null,
        addrChangeSlipPath: null,
        addrChangeReason: null,
      },
    }),
  );
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath(`/sell/bookings/${bookingId}`);
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}

/**
 * Seller reviews the address-change request: approve (with new shipping fee) or reject.
 * Approval with diff==0 auto-applies the change immediately.
 * Approval with diff>0 sets status="approved" and waits for renter top-up slip.
 */
export async function reviewAddressChange(
  bookingId: string,
  formData: FormData,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const booking = await loadBookingForAddrChange(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.shop?.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (booking.addrChangeStatus !== "requested")
    return { ok: false, error: "ไม่มีคำขอแก้ที่อยู่ที่รอการอนุมัติ" };

  const action = String(formData.get("action") ?? "").trim();

  if (action === "reject") {
    const reason = String(formData.get("reason") ?? "").trim() || null;
    const res = await withActor(user.id, () =>
      db.booking.updateMany({
        where: { id: bookingId, shopId: booking.shopId, addrChangeStatus: "requested" },
        data: {
          addrChangeStatus: "rejected",
          addrChangeReason: reason,
          pendingRecipientName: null,
          pendingPhone: null,
          pendingAddressText: null,
          pendingShippingFee: null,
          addrChangeDiff: null,
          addrChangeSlipPath: null,
        },
      }),
    );
    if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  } else if (action === "approve") {
    const newShippingFee = Math.round(Number(formData.get("new_shipping_fee")));
    if (!Number.isFinite(newShippingFee) || newShippingFee < 0)
      return { ok: false, error: "ค่าจัดส่งไม่ถูกต้อง" };

    const diff = Math.max(0, newShippingFee - (booking.shippingFee ?? 0));

    if (diff === 0) {
      // Auto-apply: copy pending → live snapshot, mark done, clear pending
      const res = await withActor(user.id, () =>
        db.booking.updateMany({
          where: { id: bookingId, shopId: booking.shopId, addrChangeStatus: "requested" },
          data: {
            recipientName: booking.pendingRecipientName,
            phone: booking.pendingPhone,
            addressText: booking.pendingAddressText,
            shippingFee: newShippingFee,
            addrChangeStatus: "done",
            pendingRecipientName: null,
            pendingPhone: null,
            pendingAddressText: null,
            pendingShippingFee: null,
            addrChangeDiff: null,
            addrChangeSlipPath: null,
          },
        }),
      );
      if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
    } else {
      // diff > 0: require renter top-up
      const res = await withActor(user.id, () =>
        db.booking.updateMany({
          where: { id: bookingId, shopId: booking.shopId, addrChangeStatus: "requested" },
          data: {
            pendingShippingFee: newShippingFee,
            addrChangeDiff: diff,
            addrChangeStatus: "approved",
          },
        }),
      );
      if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
    }
  } else {
    return { ok: false, error: "action ไม่ถูกต้อง" };
  }

  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath(`/sell/bookings/${bookingId}`);
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}

/**
 * Renter uploads a top-up payment slip for the shipping-fee difference.
 * Only valid when addrChangeStatus === "approved" and addrChangeDiff > 0.
 */
export async function payAddressChangeDiff(
  bookingId: string,
  formData: FormData,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const booking = await loadBookingForAddrChange(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (booking.addrChangeStatus !== "approved")
    return { ok: false, error: "ไม่อยู่ในขั้นตอนอัปโหลดสลิปส่วนต่าง" };
  if ((booking.addrChangeDiff ?? 0) <= 0)
    return { ok: false, error: "ไม่มีส่วนต่างที่ต้องชำระ" };

  const file = formData.get("slip");
  if (!file || typeof file === "string") return { ok: false, error: "ยังไม่ได้เลือกไฟล์สลิป" };
  if (file.size > MAX_SLIP_SIZE) return { ok: false, error: "ไฟล์ใหญ่เกิน 5MB" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = detectSlipMime(buffer);
  if (!mime) return { ok: false, error: "ไฟล์ต้องเป็นรูปภาพ (JPG/PNG/WebP)" };
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];

  const key = `addr-change-slips/${bookingId}/${randomUUID()}.${ext}`;
  try {
    await uploadPrivateToR2(key, buffer, mime);
  } catch (e) {
    console.error("[doprent] addr-change slip upload error", e);
    return { ok: false, error: "อัปโหลดสลิปไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  const res = await withActor(user.id, () =>
    db.booking.updateMany({
      where: {
        id: bookingId,
        renterId: user.id,
        addrChangeStatus: "approved",
      },
      data: {
        addrChangeSlipPath: key,
        addrChangeStatus: "paid_review",
      },
    }),
  );
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath(`/sell/bookings/${bookingId}`);
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}

/**
 * Seller confirms or rejects the renter's top-up slip for the address-change diff.
 * Confirm → apply the pending address change. Reject → back to "approved" for re-upload.
 */
export async function confirmAddressChange(
  bookingId: string,
  formData: FormData,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const booking = await loadBookingForAddrChange(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.shop?.ownerId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (booking.addrChangeStatus !== "paid_review")
    return { ok: false, error: "ไม่อยู่ในขั้นตอนตรวจสลิปส่วนต่าง" };

  const action = String(formData.get("action") ?? "").trim();

  if (action === "confirm") {
    const res = await withActor(user.id, () =>
      db.booking.updateMany({
        where: { id: bookingId, shopId: booking.shopId, addrChangeStatus: "paid_review" },
        data: {
          recipientName: booking.pendingRecipientName,
          phone: booking.pendingPhone,
          addressText: booking.pendingAddressText,
          shippingFee: booking.pendingShippingFee,
          addrChangeStatus: "done",
          pendingRecipientName: null,
          pendingPhone: null,
          pendingAddressText: null,
          pendingShippingFee: null,
          addrChangeDiff: null,
          addrChangeSlipPath: null,
        },
      }),
    );
    if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  } else if (action === "reject") {
    const reason = String(formData.get("reason") ?? "").trim() || null;
    const res = await withActor(user.id, () =>
      db.booking.updateMany({
        where: { id: bookingId, shopId: booking.shopId, addrChangeStatus: "paid_review" },
        data: {
          addrChangeStatus: "approved",
          addrChangeReason: reason,
          // Keep pendingShippingFee + addrChangeDiff intact so renter knows the amount
          addrChangeSlipPath: null,
        },
      }),
    );
    if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  } else {
    return { ok: false, error: "action ไม่ถูกต้อง" };
  }

  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath(`/sell/bookings/${bookingId}`);
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}
