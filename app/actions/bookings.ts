"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
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
  shippingBuffers,
  BOOKING_BLOCKING_STATUSES,
  type EffectivePolicy,
} from "@/lib/booking-policy";
import { bookingWindow, pickFreeUnit, hasFreeUnit } from "@/lib/unit-assignment";
import { blockedUnitDatesInRange } from "@/lib/product-units";
import { normalizeTiers, priceForNights } from "@/lib/pricing";
import { resolvePaymentChannel, type PaymentChannel } from "@/lib/payments";
import {
  notifyBookingAccepted,
  notifyBookingConfirmed,
  notifyBookingRejected,
  notifyNewBookingRequest,
  notifySlipDisputed,
  notifyAdminDisputeEscalated,
  notifyCancelRequested,
} from "@/lib/notifications";
import { FIRST_TOUCH_COOKIE, decodeAttribution } from "@/lib/attribution";
import { parseBusinessHours } from "@/lib/hours";
import { todayBkk } from "@/lib/date-th";
import { BOOKING_SLIP_MAX_BYTES } from "@/lib/config";
import { addDaysLocal, dateRangeLocal } from "@/lib/booking-dates";
import { detectSlipMime } from "@/lib/file-mime";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/** Minutes from "now" until the shop closes today, in the Asia/Bangkok wall
 *  clock. null when the shop is closed today or hours are unparseable. Negative
 *  when already past closing. Used to gate same-day express dispatch server-side
 *  (the client computes the same thing for the UI). */
function minutesUntilCloseBkk(hours: ReturnType<typeof parseBusinessHours>): number | null {
  if (!hours) return null;
  const dow = new Date(`${todayBkk()}T00:00:00Z`).getUTCDay();
  const today = hours[dow];
  if (!today?.open) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const [closeH, closeM] = today.to.split(":").map(Number);
  return closeH * 60 + closeM - (hh * 60 + mm);
}

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
  const lineId = String(formData.get("line_id") ?? "").trim() || null;
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
        lineId,
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
  const lineId = String(formData.get("line_id") ?? "").trim() || null;
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
      data: { recipientName: recipient, phone, addressLine, lineId },
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

/**
 * Item shape accepted in the optional `items` JSON field for multi-item customer checkout.
 * qty defaults to 1; qty > 1 expands into that many BookingItem rows of the same variant.
 */
export type BookingItemInput = {
  productId: string;
  variantId: string | null;
  qty?: number;
};

export async function createBooking(formData: FormData): Promise<Result<{ id: string }>> {
  // Staff accounts are shop-management logins only — they must NEVER be able to
  // place a rental order. Block them explicitly before any user resolution
  // (a staff session id is "staff:<id>", not a real user, so getCurrentUser()
  // would otherwise throw on the non-UUID id).
  const session = await auth();
  if (session?.user?.role === "staff")
    return { ok: false, error: "บัญชีพนักงานไม่สามารถสั่งเช่าสินค้าได้" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const addressId = String(formData.get("address_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  // Optional pickup/return time-of-day. Stored only when both are valid HH:MM;
  // otherwise null = full day. Logistics only — no effect on price/stock.
  const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const startTimeRaw = String(formData.get("start_time") ?? "").trim();
  const endTimeRaw = String(formData.get("end_time") ?? "").trim();
  const bothTimes = isHHMM(startTimeRaw) && isHHMM(endTimeRaw);
  const startTime = bothTimes ? startTimeRaw : null;
  const endTime = bothTimes ? endTimeRaw : null;
  // Delivery methods, now split into two legs chosen on the calendar page:
  //   outbound (shop→customer) drives the before-rental transit buffer
  //   return   (customer→shop) drives the after-rental transit buffer
  // The carrier is chosen later by the shop (when shipping a standard order),
  // and express pickup is coordinated by the shop with the renter after accept.
  // `delivery_method` is kept as a legacy fallback (= outbound) for old forms.
  const legacyDelivery = String(formData.get("delivery_method") ?? "").trim() || null;
  const outboundMethod = String(formData.get("outbound_method") ?? "").trim() || legacyDelivery;
  const returnMethod = String(formData.get("return_method") ?? "").trim() || legacyDelivery;
  // deliveryMethod column mirrors the outbound leg for back-compat.
  const deliveryMethod = outboundMethod;
  const deliveryCarrier = null;

  // ── Normalize into a lineItems array ──────────────────────────────────────
  // When `items` JSON is present, parse it (multi-item path).
  // Otherwise fall back to single-field parsing (legacy back-compat).
  const itemsJson = String(formData.get("items") ?? "").trim();
  let lineItems: BookingItemInput[];
  if (itemsJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(itemsJson);
    } catch {
      return { ok: false, error: "รูปแบบรายการสินค้าไม่ถูกต้อง" };
    }
    if (!Array.isArray(parsed) || parsed.length === 0)
      return { ok: false, error: "รายการสินค้าต้องมีอย่างน้อย 1 รายการ" };
    lineItems = (parsed as BookingItemInput[]).map((it) => ({
      productId: String(it.productId ?? "").trim(),
      variantId: it.variantId ? String(it.variantId).trim() : null,
      qty: Math.max(1, Math.round(Number(it.qty ?? 1))),
    }));
    if (lineItems.some((it) => !it.productId))
      return { ok: false, error: "รายการสินค้าไม่ครบถ้วน" };
  } else {
    // Legacy single-field path.
    // `dress_id` accepted as a legacy alias during the rename deploy window.
    const productId = String(formData.get("product_id") ?? formData.get("dress_id") ?? "").trim();
    const variantIdRaw = String(formData.get("variant_id") ?? "").trim() || null;
    if (!productId)
      return { ok: false, error: "ข้อมูลการจองไม่ครบ" };
    lineItems = [{ productId, variantId: variantIdRaw, qty: 1 }];
  }

  // ID card path: mandatory for online bookings, optional for walk-in.
  const idCardPath = String(formData.get("id_card_path") ?? "").trim() || null;
  const bookingSource = String(formData.get("source") ?? "online").trim() || "online";
  if (bookingSource === "online" && !idCardPath)
    return { ok: false, error: "กรุณาแนบรูปถ่ายบัตรประชาชนก่อนจอง" };

  if (!addressId || !startDate || !endDate)
    return { ok: false, error: "ข้อมูลการจองไม่ครบ" };
  if (endDate < startDate) return { ok: false, error: "วันคืนชุดต้องไม่ก่อนวันรับ" };

  return withActor(user.id, async () => {
    // anti-spam: cap pending requests per renter (one multi-item booking = 1 toward cap)
    const pendingCount = await db.booking.count({
      where: { renterId: user.id, status: "booking_pending" },
    });
    if (pendingCount >= 3)
      return { ok: false, error: "มีคำขอจองที่รอร้านอยู่ 3 รายการแล้ว รอร้านตอบก่อนนะ" };

    // Validate that the provided id_card_path belongs to this user (security check).
    if (idCardPath) {
      const cardOwner = await db.userIdCard.findFirst({
        where: { path: idCardPath, userId: user.id },
        select: { id: true },
      });
      if (!cardOwner)
        return { ok: false, error: "ภาพบัตรประชาชนไม่ถูกต้อง กรุณาเลือกใหม่" };
    }

    // ── Load products for all line items ──────────────────────────────────────
    // We need: name, shopId, pricePerDay, priceTiers, deposit, status, available, policy, shop.
    // Load them in bulk then index by id.
    const distinctProductIds = [...new Set(lineItems.map((it) => it.productId))];
    const products = await db.product.findMany({
      where: { id: { in: distinctProductIds } },
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
        policyOverride: true,
        leadTimeDays: true,
        minRentalDays: true,
        maxRentalDays: true,
        returnWindowDays: true,
        bufferDaysAfter: true, cleaningDays: true,
        bufferDaysBefore: true,
        shop: {
          select: {
            owner: { select: { email: true } },
            hours: true,
            isOpen: true,
            leadTimeDays: true,
            minRentalDays: true,
            maxRentalDays: true,
            returnWindowDays: true,
            bufferDaysAfter: true, cleaningDays: true,
            bufferDaysBefore: true,
            closedWeekdays: true,
            closedDates: {
              select: { date: true },
            },
          },
        },
      },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    // Validate every product exists, is live, and belongs to same shop.
    let sharedShopId: string | null = null;
    let firstProduct = productById.get(lineItems[0].productId);
    if (!firstProduct) return { ok: false, error: "ไม่พบสินค้า" };
    sharedShopId = firstProduct.shopId;

    for (const it of lineItems) {
      const p = productById.get(it.productId);
      if (!p) return { ok: false, error: "ไม่พบสินค้า" };
      if (p.status !== "live" || !p.available)
        return { ok: false, error: "สินค้านี้ยังไม่เปิดให้จองในขณะนี้" };
      if (p.shopId !== sharedShopId)
        return { ok: false, error: "สินค้าทุกชิ้นต้องมาจากร้านเดียวกัน" };
    }

    // Re-assign firstProduct for clarity (always set when we reach here).
    firstProduct = productById.get(lineItems[0].productId)!;

    // ── Delivery-method gating (same-day rules, uses first product's shop) ───
    // Both legs must be a valid method. Same-day gating applies to the OUTBOUND
    // leg only — that's the shipment the shop must get out the door today.
    if (outboundMethod !== "express" && outboundMethod !== "standard")
      return { ok: false, error: "กรุณาเลือกวิธีจัดส่ง (ขาไป)" };
    if (returnMethod !== "express" && returnMethod !== "standard")
      return { ok: false, error: "กรุณาเลือกวิธีส่งคืน (ขากลับ)" };
    if (startDate === todayBkk()) {
      if (outboundMethod === "standard")
        return {
          ok: false,
          error: "ส่งพัสดุไม่สามารถจัดส่งภายในวันได้ กรุณาเลือกส่งด่วน หรือเลือกวันรับชุดเป็นวันอื่น",
        };
      const minsToClose = minutesUntilCloseBkk(parseBusinessHours(firstProduct.shop.hours));
      if (firstProduct.shop.isOpen === false || minsToClose == null || minsToClose <= 60)
        return {
          ok: false,
          error: "เลยเวลาส่งด่วนสำหรับวันนี้แล้ว กรุณาเลือกวันรับชุดเป็นวันอื่น",
        };
    }

    // address snapshot (must belong to the user)
    const addr = await db.address.findFirst({
      where: { id: addressId, userId: user.id },
      select: { id: true, recipientName: true, phone: true, addressLine: true },
    });
    if (!addr) return { ok: false, error: "ไม่พบที่อยู่จัดส่ง" };

    // ── Per-item: resolve variant, compute pricing, run policy check ──────────
    type ResolvedLineItem = {
      productId: string;
      variantId: string | null;
      qty: number;
      rentalTotal: number; // per-unit rental
      deposit: number;     // per-unit deposit
      variantQuantity: number; // rentable unit count (for oversell check)
      hasVariant: boolean;
      bufferAfter: number;
      bufferBefore: number;
      effectivePolicy: EffectivePolicy;
    };

    const days = rentalDays(startDate, endDate);
    const today = new Date().toISOString().slice(0, 10);
    const resolvedItems: ResolvedLineItem[] = [];

    for (const li of lineItems) {
      const product = productById.get(li.productId)!;

      let resolvedVariantId: string | null = li.variantId;
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
        const [totalUnits, rentableUnits] = await Promise.all([
          db.productUnit.count({ where: { variantId: resolvedVariantId } }),
          db.productUnit.count({
            where: { variantId: resolvedVariantId, status: { in: ["available", "rented"] } },
          }),
        ]);
        variantQuantity = totalUnits > 0 ? rentableUnits : variant.quantity;
      }

      const effectivePolicy = resolveEffectivePolicy(
        {
          leadTimeDays: product.shop.leadTimeDays,
          minRentalDays: product.shop.minRentalDays,
          maxRentalDays: product.shop.maxRentalDays,
          returnWindowDays: product.shop.returnWindowDays,
          bufferDaysAfter: product.shop.bufferDaysAfter,
          bufferDaysBefore: product.shop.bufferDaysBefore,
          cleaningDays: product.shop.cleaningDays,
          closedWeekdays: product.shop.closedWeekdays,
        },
        {
          policyOverride: product.policyOverride,
          leadTimeDays: product.leadTimeDays,
          minRentalDays: product.minRentalDays,
          maxRentalDays: product.maxRentalDays,
          returnWindowDays: product.returnWindowDays,
          bufferDaysAfter: product.bufferDaysAfter,
          bufferDaysBefore: product.bufferDaysBefore,
          cleaningDays: product.cleaningDays,
        },
      );

      // Policy validation per item (uses item's own product policy)
      const [activeBookingItems, blackouts] = await Promise.all([
        resolvedVariantId
          ? db.bookingItem.findMany({
              where: {
                productId: product.id,
                OR: [
                  { variantId: resolvedVariantId },
                  { variantId: null },
                ],
                booking: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
              },
              select: { booking: { select: { startDate: true, endDate: true, status: true, outboundMethod: true, returnMethod: true } } },
            })
          : db.bookingItem.findMany({
              where: {
                productId: product.id,
                booking: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
              },
              select: { booking: { select: { startDate: true, endDate: true, status: true, outboundMethod: true, returnMethod: true } } },
            }),
        db.productBlackoutDate.findMany({
          where: { productId: product.id },
          select: { date: true },
        }),
      ]);

      const unavailableDates = computeUnavailableDates({
        blackouts: blackouts.map((b) => b.date.toISOString().slice(0, 10)),
        shopClosedDates: product.shop.closedDates.map((d) => d.date.toISOString().slice(0, 10)),
        bookings: activeBookingItems.map((b) => ({
          startDate: b.booking.startDate,
          endDate: b.booking.endDate,
          status: b.booking.status,
          outboundMethod: b.booking.outboundMethod,
          returnMethod: b.booking.returnMethod,
        })),
        effectivePolicy,
        rangeStart: startDate,
        rangeEnd: endDate,
        quantity: variantQuantity,
      });

      const policyCheck = validateBookingRange({
        startDate,
        endDate,
        effectivePolicy,
        unavailableDates,
        today,
        outboundMethod,
        returnMethod,
      });
      if (!policyCheck.ok) return { ok: false, error: policyCheck.error };

      const tiers = normalizeTiers(
        product.priceTiers.map((t, i) => ({
          min: t.minDays,
          max: i < product.priceTiers.length - 1 ? product.priceTiers[i + 1].minDays - 1 : null,
          per_day: t.pricePerDay,
        })),
      );
      const perUnitRentalTotal = priceForNights(tiers, variantPricePerDay, days).total;

      // Final hold window for THIS booking derived from its two shipping legs.
      const itemBuffers = shippingBuffers(effectivePolicy, outboundMethod, returnMethod);

      resolvedItems.push({
        productId: product.id,
        variantId: resolvedVariantId,
        qty: li.qty ?? 1,
        rentalTotal: perUnitRentalTotal,
        deposit: variantDeposit,
        variantQuantity,
        hasVariant: !!resolvedVariantId,
        bufferBefore: itemBuffers.before,
        bufferAfter: itemBuffers.after,
        effectivePolicy,
      });
    }

    // Summed totals for the booking header
    const sumRentalTotal = resolvedItems.reduce((s, it) => s + it.rentalTotal * it.qty, 0);
    const sumDeposit = resolvedItems.reduce((s, it) => s + it.deposit * it.qty, 0);

    // First-touch channel of the renter — closes the acquisition→booking loop.
    const channel =
      decodeAttribution(cookies().get(FIRST_TOUCH_COOKIE)?.value)?.channel ?? null;

    // ── TX-guarded oversell prevention ───────────────────────────────────────
    // Items with a variant need a locked per-variant day-count check.
    // Items without a variant are inserted directly (legacy no-oversell path).
    const variantItems = resolvedItems.filter((it) => it.hasVariant);
    const noVariantItems = resolvedItems.filter((it) => !it.hasVariant);

    if (variantItems.length > 0) {
      // Collect distinct variantIds in sorted order (deadlock avoidance).
      const distinctVariantIds = [...new Set(variantItems.map((it) => it.variantId!))].sort();

      let txResult: { ok: true; id: string } | { ok: false; error: string };
      try {
        txResult = await db.$transaction(async (tx) => {
          // Lock all variant rows in sorted order.
          for (const vId of distinctVariantIds) {
            await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${vId}::uuid FOR UPDATE`;
          }

          // In-cart consumption tracker: when the cart contains multiple line items
          // of the same variant, each consumes one unit of capacity per day in the
          // shared window. This prevents a 2-unit variant from being over-allocated
          // by a single cart asking for 3.
          const cartConsumedByVariant = new Map<string, number>();

          for (const item of variantItems) {
            const vId = item.variantId!;
            // THIS booking's hold window (before/after already derived from its
            // own outbound/return legs via shippingBuffers in resolvedItems).
            const reqBufferBefore = item.bufferBefore;
            const reqBufferAfter = item.bufferAfter;

            const overlapItems = await tx.bookingItem.findMany({
              where: {
                OR: [
                  { variantId: vId },
                  { variantId: null, productId: item.productId },
                ],
                booking: { status: { in: [...BOOKING_BLOCKING_STATUSES] } },
              },
              select: { booking: { select: { startDate: true, endDate: true, outboundMethod: true, returnMethod: true } } },
            });

            const dayCount = new Map<string, number>();
            for (const b of overlapItems) {
              // Each existing booking holds its own window from its own legs;
              // null/legacy methods fall back to standard (worst case).
              const { before, after } = shippingBuffers(
                item.effectivePolicy,
                b.booking.outboundMethod,
                b.booking.returnMethod,
              );
              const bStart = addDaysLocal(b.booking.startDate.toISOString().slice(0, 10), -before);
              const bEnd = addDaysLocal(b.booking.endDate.toISOString().slice(0, 10), after);
              for (const d of dateRangeLocal(bStart, bEnd)) {
                dayCount.set(d, (dayCount.get(d) ?? 0) + 1);
              }
            }

            const reqStart = addDaysLocal(startDate, -reqBufferBefore);
            const reqEnd = addDaysLocal(endDate, reqBufferAfter);
            const blockedDays = await blockedUnitDatesInRange(tx, vId, reqStart, reqEnd);
            for (const b of blockedDays) {
              dayCount.set(b.ymd, (dayCount.get(b.ymd) ?? 0) + 1);
            }

            // How many units from THIS cart have already claimed this variant.
            const cartConsumed = cartConsumedByVariant.get(vId) ?? 0;

            // Check each unit of qty this line item requests.
            for (let unitIdx = 0; unitIdx < item.qty; unitIdx++) {
              // Effective holds = committed holds + units already consumed by earlier cart items.
              for (const d of dateRangeLocal(reqStart, reqEnd)) {
                const effectiveCount = (dayCount.get(d) ?? 0) + cartConsumed + unitIdx;
                if (effectiveCount >= item.variantQuantity) {
                  const [, m, day] = d.split("-");
                  return {
                    ok: false as const,
                    error: `ไซซ์นี้เต็มในวันที่ ${parseInt(day ?? "0")}/${parseInt(m ?? "0")} กรุณาเลือกวันอื่น`,
                  };
                }
              }
            }

            // Mark qty units consumed for this variant within this cart.
            cartConsumedByVariant.set(vId, cartConsumed + item.qty);
          }

          // Build items.create rows: expand qty > 1 into multiple BookingItem rows.
          const itemCreateRows = [
            ...variantItems.flatMap((it) =>
              Array.from({ length: it.qty }, () => ({
                productId: it.productId,
                variantId: it.variantId ?? undefined,
                rentalTotal: it.rentalTotal,
                deposit: it.deposit,
              })),
            ),
            ...noVariantItems.flatMap((it) =>
              Array.from({ length: it.qty }, () => ({
                productId: it.productId,
                rentalTotal: it.rentalTotal,
                deposit: it.deposit,
              })),
            ),
          ];

          const row = await tx.booking.create({
            data: {
              renterId: user.id,
              shopId: sharedShopId!,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              startTime,
              endTime,
              rentalTotal: sumRentalTotal,
              deposit: sumDeposit,
              commissionRate: PLATFORM_COMMISSION_RATE,
              commissionAmount: commissionAmount(sumRentalTotal),
              channel,
              status: "booking_pending",
              addressId: addr.id,
              recipientName: addr.recipientName,
              phone: addr.phone,
              addressText: addr.addressLine,
              deliveryMethod,
              outboundMethod,
              returnMethod,
              deliveryCarrier,
              idCardPath: idCardPath ?? undefined,
              items: { create: itemCreateRows },
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

      // Fire-and-forget: notify the shop owner about the new request.
      notifyNewBookingRequest({
        sellerEmail: firstProduct.shop?.owner?.email,
        dressName: firstProduct.name,
        startDate,
        endDate,
        bookingId: txResult.id,
      });

      revalidatePath("/account/bookings");
      return { ok: true, id: txResult.id };
    } else {
      // All items are legacy no-variant — simple insert (no lock needed).
      const itemCreateRows = noVariantItems.flatMap((it) =>
        Array.from({ length: it.qty }, () => ({
          productId: it.productId,
          rentalTotal: it.rentalTotal,
          deposit: it.deposit,
        })),
      );

      const row = await db.booking.create({
        data: {
          renterId: user.id,
          shopId: sharedShopId!,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          startTime,
          endTime,
          rentalTotal: sumRentalTotal,
          deposit: sumDeposit,
          commissionRate: PLATFORM_COMMISSION_RATE,
          commissionAmount: commissionAmount(sumRentalTotal),
          channel,
          status: "booking_pending",
          addressId: addr.id,
          recipientName: addr.recipientName,
          phone: addr.phone,
          addressText: addr.addressLine,
          deliveryMethod,
          outboundMethod,
          returnMethod,
          deliveryCarrier,
          idCardPath: idCardPath ?? undefined,
          items: { create: itemCreateRows },
        },
        select: { id: true },
      });

      // Fire-and-forget: notify the shop owner about the new request.
      notifyNewBookingRequest({
        sellerEmail: firstProduct.shop?.owner?.email,
        dressName: firstProduct.name,
        startDate,
        endDate,
        bookingId: row.id,
      });

      revalidatePath("/account/bookings");
      return { ok: true, id: row.id };
    }
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
      items: { select: { id: true, unitId: true, product: { select: { name: true } } } },
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
  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  // Accepting is the moment the hold begins: assign a physical unit, start the
  // 3h payment clock, and auto-reject any other pending request that can no
  // longer be fulfilled now that this unit is taken. All under a variant row
  // lock so two concurrent accepts can't hand out the same unit.
  type AcceptOutcome =
    | { kind: "ok"; rejected: { id: string; email?: string | null; name?: string }[] }
    | { kind: "stale" }
    | { kind: "full" };

  let outcome: AcceptOutcome;
  try {
    outcome = await withActor(user.id, () =>
      db.$transaction(async (tx): Promise<AcceptOutcome> => {
        const bk = await tx.booking.findUnique({
          where: { id: bookingId },
          select: {
            status: true,
            startDate: true,
            endDate: true,
            items: {
              select: {
                id: true,
                variantId: true,
                product: {
                  select: {
                    policyOverride: true,
                    leadTimeDays: true,
                    minRentalDays: true,
                    maxRentalDays: true,
                    returnWindowDays: true,
                    bufferDaysAfter: true, cleaningDays: true,
                    bufferDaysBefore: true,
                    shop: {
                      select: {
                        leadTimeDays: true,
                        minRentalDays: true,
                        maxRentalDays: true,
                        returnWindowDays: true,
                        bufferDaysAfter: true, cleaningDays: true,
                        bufferDaysBefore: true,
                        closedWeekdays: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (!bk || bk.status !== "booking_pending") return { kind: "stale" };

        const acceptData = {
          shippingFee: Math.round(shippingFee),
          paymentMethod: channel,
          status: "waiting_for_payment" as const,
          currentDueAt: new Date(dueAt()),
        };

        // Items that have a variant (and therefore need a serialized unit assigned).
        const itemsNeedingUnit = bk.items.filter((it) => it.variantId && it.product);

        // Legacy bookings without any variant-linked items — just flip status.
        if (itemsNeedingUnit.length === 0) {
          await tx.booking.update({ where: { id: bookingId }, data: acceptData });
          return { kind: "ok", rejected: [] };
        }

        // Lock all distinct involved variant rows in sorted order to prevent deadlock.
        const variantIds = [...new Set(itemsNeedingUnit.map((it) => it.variantId!).filter(Boolean))].sort();
        for (const vId of variantIds) {
          await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${vId}::uuid FOR UPDATE`;
        }

        // Assign a unit per item. Track in-loop picks per variant so two items of the
        // same variant don't grab the same unit.
        type Hold = { unitId: string; winStart: string; winEnd: string };
        const chosen: { itemId: string; unitId: string }[] = [];
        const extraHoldsByVariant = new Map<string, Hold[]>();

        for (const it of itemsNeedingUnit) {
          const policy = resolveEffectivePolicy(it.product!.shop, it.product!);
          const before = policy.bufferDaysBefore ?? 0;
          const after = policy.bufferDaysAfter;
          const win = bookingWindow(ymd(bk.startDate), ymd(bk.endDate), before, after);

          const allUnits = await tx.productUnit.findMany({
            where: { variantId: it.variantId!, status: { in: ["available", "rented"] } },
            select: { id: true, code: true },
            orderBy: { code: "asc" },
          });
          const blockedUnits = await blockedUnitDatesInRange(tx, it.variantId!, win.winStart, win.winEnd);
          const blockedUnitIds = new Set(blockedUnits.map((b) => b.unitId));
          const units = allUnits.filter((u) => !blockedUnitIds.has(u.id));

          // DB holds for this variant from OTHER committed bookings (exclude this booking).
          const dbHoldRows = await tx.bookingItem.findMany({
            where: {
              variantId: it.variantId!,
              unitId: { not: null },
              booking: {
                status: { in: [...BOOKING_BLOCKING_STATUSES] },
                id: { not: bookingId },
              },
            },
            select: { unitId: true, booking: { select: { startDate: true, endDate: true } } },
          });
          const dbHolds: Hold[] = dbHoldRows.map((h) => ({
            unitId: h.unitId as string,
            ...bookingWindow(ymd(h.booking.startDate), ymd(h.booking.endDate), before, after),
          }));

          // Combine DB holds with units already chosen for earlier items of the same variant.
          const holds: Hold[] = [...dbHolds, ...(extraHoldsByVariant.get(it.variantId!) ?? [])];

          const pick = pickFreeUnit(units, holds, win.winStart, win.winEnd);
          if (!pick) return { kind: "full" };

          chosen.push({ itemId: it.id, unitId: pick });
          const arr = extraHoldsByVariant.get(it.variantId!) ?? [];
          arr.push({ unitId: pick, winStart: win.winStart, winEnd: win.winEnd });
          extraHoldsByVariant.set(it.variantId!, arr);
        }

        // Persist unit assignments on each BookingItem; flip booking status.
        for (const c of chosen) {
          await tx.bookingItem.update({ where: { id: c.itemId }, data: { unitId: c.unitId } });
        }
        await tx.booking.update({ where: { id: bookingId }, data: acceptData });

        // Auto-reject pending bookings that can no longer be fulfilled now that
        // these units are consumed. Process per distinct variant.
        const rejected: { id: string; email?: string | null; name?: string }[] = [];
        const rejectedIds = new Set<string>();

        for (const vId of variantIds) {
          // Rebuild allUnits + full holds for this variant (for free-slot checking).
          const it = itemsNeedingUnit.find((i) => i.variantId === vId)!;
          const policy = resolveEffectivePolicy(it.product!.shop, it.product!);
          const before = policy.bufferDaysBefore ?? 0;
          const after = policy.bufferDaysAfter;

          const allUnitsForV = await tx.productUnit.findMany({
            where: { variantId: vId, status: { in: ["available", "rented"] } },
            select: { id: true, code: true },
            orderBy: { code: "asc" },
          });
          const blockedForV = await blockedUnitDatesInRange(tx, vId, ymd(bk.startDate), ymd(bk.endDate));
          const blockedIdsForV = new Set(blockedForV.map((b) => b.unitId));
          const unitsForV = allUnitsForV.filter((u) => !blockedIdsForV.has(u.id));

          // All committed holds for V (from DB) + everything we just assigned.
          const dbHoldRowsForV = await tx.bookingItem.findMany({
            where: {
              variantId: vId,
              unitId: { not: null },
              booking: { status: { in: [...BOOKING_BLOCKING_STATUSES] } },
            },
            select: { unitId: true, booking: { select: { startDate: true, endDate: true } } },
          });
          const allHoldsForV: Hold[] = dbHoldRowsForV.map((h) => ({
            unitId: h.unitId as string,
            ...bookingWindow(ymd(h.booking.startDate), ymd(h.booking.endDate), before, after),
          }));

          // Candidate pending bookings for this variant.
          const pendingItems = await tx.bookingItem.findMany({
            where: {
              variantId: vId,
              booking: { status: "booking_pending", id: { not: bookingId } },
            },
            select: {
              booking: {
                select: {
                  id: true,
                  startDate: true,
                  endDate: true,
                  renter: { select: { email: true } },
                },
              },
              product: { select: { name: true } },
            },
          });

          for (const pi of pendingItems) {
            const bkId = pi.booking.id;
            if (rejectedIds.has(bkId)) continue;
            const pw = bookingWindow(ymd(pi.booking.startDate), ymd(pi.booking.endDate), before, after);
            if (!hasFreeUnit(unitsForV, allHoldsForV, pw.winStart, pw.winEnd)) {
              await tx.booking.update({
                where: { id: bkId },
                data: {
                  status: "rejected",
                  cancelledBy: "system",
                  cancelReason: "ไซซ์นี้ถูกจองเต็มในช่วงเวลาที่ขอ",
                  cancelFromStatus: "booking_pending",
                },
              });
              rejected.push({ id: bkId, email: pi.booking.renter?.email, name: pi.product?.name });
              rejectedIds.add(bkId);
            }
          }
        }

        return { kind: "ok", rejected };
      }),
    );
  } catch (e) {
    console.error("[doprent] acceptBooking tx error", e);
    return { ok: false, error: "รับจองไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  if (outcome.kind === "stale") return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  if (outcome.kind === "full")
    return { ok: false, error: "ไซซ์นี้ถูกจองเต็มในช่วงเวลานี้แล้ว ไม่สามารถรับจองได้" };

  notifyBookingAccepted({
    renterEmail: booking.renter?.email,
    dressName: booking.items[0]?.product?.name ?? "ชุดที่จอง",
    bookingId,
  });
  // Notify renters whose pending requests were auto-rejected by this accept.
  for (const r of outcome.rejected) {
    notifyBookingRejected({
      renterEmail: r.email,
      dressName: r.name ?? "ชุดที่จอง",
      bookingId: r.id,
    });
  }

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

/**
 * Seller ships the order — transitions confirmed → renting. For standard
 * delivery the shop also records which carrier it handed the parcel to (the
 * customer no longer picks this at checkout).
 */
export async function markRenting(
  bookingId: string,
  opts?: { carrier?: string; trackingNumber?: string; trackingUrl?: string },
): Promise<Result> {
  const trimmed = opts?.carrier?.trim();
  if (trimmed && trimmed.length > 80)
    return { ok: false, error: "ชื่อผู้ให้บริการขนส่งยาวเกินไป" };
  const trackingNumber = opts?.trackingNumber?.trim();
  if (trackingNumber && trackingNumber.length > 120)
    return { ok: false, error: "เลขพัสดุยาวเกินไป" };
  const trackingUrl = opts?.trackingUrl?.trim();
  if (trackingUrl) {
    if (trackingUrl.length > 500)
      return { ok: false, error: "ลิงก์ติดตามยาวเกินไป" };
    if (!/^https?:\/\//i.test(trackingUrl))
      return { ok: false, error: "ลิงก์ติดตามต้องขึ้นต้นด้วย http:// หรือ https://" };
  }
  return sellerSimpleMove(bookingId, "renting", undefined, {
    carrier: trimmed || undefined,
    trackingNumber: trackingNumber || undefined,
    trackingUrl: trackingUrl || undefined,
  });
}

export type ReturnCondition = "complete" | "damaged" | "not_returned";

/**
 * Seller records the physical return:
 *   complete     → returned       (ชุดสมบูรณ์)
 *   damaged      → returned       (มีความเสียหาย — ต้องระบุรายละเอียด, ตั้ง refund=required)
 *   not_returned → not_returned   (ลูกค้าไม่ส่งคืน — ตั้ง refund=required)
 */
export async function markReturned(
  bookingId: string,
  condition: ReturnCondition,
  damageNote?: string
): Promise<Result> {
  if (condition === "damaged" && !damageNote?.trim())
    return { ok: false, error: "กรุณาระบุความเสียหายที่พบ" };
  const to: BookingStatus = condition === "not_returned" ? "not_returned" : "returned";
  return sellerSimpleMove(bookingId, to, undefined, undefined, {
    condition,
    damageNote: condition === "damaged" ? damageNote!.trim() : undefined,
    requireRefund: condition === "damaged",
    forfeitDeposit: condition === "not_returned",
  });
}

/** Seller closes the rental after inspection — transitions returned → completed. */
export async function markCompleted(bookingId: string): Promise<Result> {
  return sellerSimpleMove(bookingId, "completed");
}

async function sellerSimpleMove(
  bookingId: string,
  to: BookingStatus,
  reason?: string,
  shipping?: { carrier?: string; trackingNumber?: string; trackingUrl?: string },
  returnInfo?: { condition: ReturnCondition; damageNote?: string; requireRefund: boolean; forfeitDeposit?: boolean }
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

  let res;
  try {
    res = await withActor(user.id, () =>
      db.$transaction(async (tx) => {
        const moved = await tx.booking.updateMany({
          where: { id: bookingId, status: from },
          data: {
            status: to,
            ...(reason !== undefined ? { cancelReason: reason, cancelFromStatus: from } : {}),
            ...(shipping?.carrier ? { deliveryCarrier: shipping.carrier } : {}),
            ...(shipping?.trackingNumber ? { trackingNumber: shipping.trackingNumber } : {}),
            ...(shipping?.trackingUrl ? { trackingUrl: shipping.trackingUrl } : {}),
            ...(to === "returned" ? { returnedAt: new Date() } : {}),
            ...(to === "rejected" || to === "cancel_requested" ? { cancelledBy: "shop" } : {}),
            ...(returnInfo
              ? {
                  returnCondition: returnInfo.condition,
                  returnDamageNote: returnInfo.damageNote ?? null,
                  ...(returnInfo.requireRefund ? { refundStatus: "required" } : {}),
                  ...(returnInfo.forfeitDeposit ? { refundStatus: "forfeited" } : {}),
                }
              : {}),
          },
        });
        if (moved.count > 0) {
          // Physical unit status follows the rental lifecycle:
          //   renting       → 'rented'    (dress is out the door)
          //   returned      → 'available' (back in stock, ready to rent again)
          //   rejected      → 'available' (hold dropped; harmless if it wasn't rented)
          //   not_returned  → 'lost'      (customer didn't return — mark unit lost with booking ref)
          const itemUnitIds = booking.items.map((i) => i.unitId).filter((x): x is string => !!x);
          if (itemUnitIds.length > 0) {
            if (to === "renting") {
              await tx.productUnit.updateMany({ where: { id: { in: itemUnitIds } }, data: { status: "rented" } });
            } else if (to === "not_returned") {
              await tx.productUnit.updateMany({
                where: { id: { in: itemUnitIds } },
                data: { status: "lost", lostFromBookingId: bookingId, note: "สูญหาย — ลูกค้าไม่คืนของ" },
              });
            } else if (to === "returned" || to === "rejected") {
              await tx.productUnit.updateMany({ where: { id: { in: itemUnitIds } }, data: { status: "available" } });
            }
          }
          // Clear the item unit linkage when the hold is dropped for good (rejected).
          if (to === "rejected") {
            await tx.bookingItem.updateMany({ where: { bookingId }, data: { unitId: null } });
          }
        }
        return moved;
      }),
    );
  } catch (e) {
    console.error("[doprent] seller move error", e);
    return { ok: false, error: "อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  // Fire-and-forget renter notifications per transition.
  const renterNotify = {
    renterEmail: booking.renter?.email,
    dressName: booking.items[0]?.product?.name ?? "ชุดที่จอง",
    bookingId,
  };
  if (to === "rejected") notifyBookingRejected(renterNotify);
  else if (to === "confirmed") notifyBookingConfirmed(renterNotify);
  else if (to === "slip_disputed") notifySlipDisputed(renterNotify);
  else if (to === "cancel_requested") {
    // Notify admin a shop-side cancel is waiting for approval.
    const admins = await db.user.findMany({ where: { role: "admin" }, select: { email: true } });
    for (const admin of admins) {
      notifyCancelRequested({
        adminEmail: admin.email,
        dressName: booking.items[0]?.product?.name ?? "ชุดที่จอง",
        bookingId,
        requestedBy: "shop",
        reason,
      });
    }
  }

  revalidatePath("/sell/bookings");
  revalidatePath("/account/bookings");
  return { ok: true };
}

/* ------------------------------ renter ------------------------------- */

// Slip upload validation (magic bytes + size), mirrors /api/upload.
const MAX_SLIP_SIZE = BOOKING_SLIP_MAX_BYTES;

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

  const from = booking.status as BookingStatus;
  try {
    const res = await withActor(user.id, () =>
      db.booking.updateMany({
        where: { id: bookingId, status: from, renterId: user.id },
        data: { slipPath: key, status: "payment_review", disputeNote: null, cancelReason: null, paymentReviewAt: new Date() },
      }),
    );
    if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  } catch (e) {
    console.error("[doprent] slip status update error", e);
    return { ok: false, error: "อัปเดตสถานะไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
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

  let res;
  try {
    res = await withActor(user.id, () =>
      db.$transaction(async (tx) => {
        const moved = await tx.booking.updateMany({
          where: { id: bookingId, status: from, renterId: user.id },
          // Drop the unit hold so the freed dates return to stock immediately.
          data: { status: "cancelled", cancelledBy: "renter" },
        });
        if (moved.count > 0) {
          const itemUnitIds = booking.items.map((i) => i.unitId).filter((x): x is string => !!x);
          if (itemUnitIds.length > 0) {
            await tx.productUnit.updateMany({ where: { id: { in: itemUnitIds } }, data: { status: "available" } });
          }
          await tx.bookingItem.updateMany({ where: { bookingId }, data: { unitId: null } });
        }
        return moved;
      }),
    );
  } catch (e) {
    console.error("[doprent] cancel booking error", e);
    return { ok: false, error: "ยกเลิกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };
  revalidatePath("/account/bookings");
  revalidatePath("/sell/bookings");
  return { ok: true };
}

/**
 * Renter requests a cancellation after payment has been made.
 * This is NOT an instant cancel — it enters cancel_requested and waits for admin approval.
 * Unit is NOT released here; admin decides on approval.
 */
export async function requestCancelAfterPayment(
  bookingId: string,
  reason: string,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  const from = booking.status as BookingStatus;
  if (!findTransition(from, "cancel_requested", "renter"))
    return { ok: false, error: "ขอยกเลิกในขั้นตอนนี้ไม่ได้" };
  if (!reason.trim()) return { ok: false, error: "กรุณาระบุเหตุผลการขอยกเลิก" };

  let res;
  try {
    res = await withActor(user.id, () =>
      db.booking.updateMany({
        where: { id: bookingId, status: from, renterId: user.id },
        data: {
          status: "cancel_requested",
          cancelFromStatus: from,
          cancelledBy: "renter",
          cancelReason: reason.trim(),
        },
      }),
    );
  } catch (e) {
    console.error("[doprent] requestCancelAfterPayment error", e);
    return { ok: false, error: "ส่งคำขอยกเลิกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  // Fire-and-forget: notify all admins a cancel is waiting for their approval.
  const admins = await db.user.findMany({
    where: { role: "admin" },
    select: { email: true },
  });
  for (const admin of admins) {
    notifyCancelRequested({
      adminEmail: admin.email,
      dressName: booking.items[0]?.product?.name ?? "ชุดที่จอง",
      bookingId,
      requestedBy: "renter",
      reason: reason.trim(),
    });
  }

  revalidatePath("/account/bookings");
  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath("/sell/bookings");
  return { ok: true };
}

/** Renter escalates a slip dispute — sends counter-argument for admin to judge. */
export async function escalateDispute(bookingId: string, note: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "ไม่พบการจอง" };
  if (booking.renterId !== user.id) return { ok: false, error: "ไม่มีสิทธิ์จัดการการจองนี้" };
  if (booking.status !== "slip_disputed")
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  if (!note.trim()) return { ok: false, error: "กรุณาใส่เหตุผลโต้แย้ง" };

  let res;
  try {
    res = await withActor(user.id, () =>
      db.booking.updateMany({
        where: { id: bookingId, status: "slip_disputed", renterId: user.id },
        data: { disputeNote: note.trim() },
      }),
    );
  } catch (e) {
    console.error("[doprent] escalate dispute error", e);
    return { ok: false, error: "ส่งข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  if (res.count === 0) return { ok: false, error: "สถานะเปลี่ยนไปแล้ว ลองรีเฟรช" };

  const admins = await db.user.findMany({
    where: { role: "admin" },
    select: { email: true },
  });
  for (const admin of admins) {
    notifyAdminDisputeEscalated({
      adminEmail: admin.email,
      dressName: booking.items[0]?.product?.name ?? "ชุดที่จอง",
      bookingId,
      renterNote: note.trim(),
    });
  }

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
