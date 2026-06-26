"use server";

import { revalidatePath } from "next/cache";
import { requireShopAccess } from "@/lib/shop-access";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withActor } from "@/lib/db-context";
import {
  PLATFORM_COMMISSION_RATE,
  commissionAmount,
  rentalDays,
} from "@/lib/bookings";
import { normalizeTiers, priceForNights } from "@/lib/pricing";
import { resolveEffectivePolicy, BOOKING_BLOCKING_STATUSES } from "@/lib/booking-policy";
import { bookingWindow, pickFreeUnit, windowsOverlap } from "@/lib/unit-assignment";
import { syncVariantUnits, blockedUnitDatesInRange } from "@/lib/product-units";

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

type FulfillmentMethod = "walk_in" | "express" | "standard";

const PRODUCT_POLICY_SELECT = {
  id: true,
  slug: true,
  shopId: true,
  policyOverride: true,
  leadTimeDays: true,
  minRentalDays: true,
  maxRentalDays: true,
  returnWindowDays: true,
  bufferDaysAfter: true,
  bufferDaysBefore: true,
  shop: {
    select: {
      leadTimeDays: true,
      minRentalDays: true,
      maxRentalDays: true,
      returnWindowDays: true,
      bufferDaysAfter: true,
      bufferDaysBefore: true,
      closedWeekdays: true,
    },
  },
} as const;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Pre-ship transit days apply only to standard shipping (walk-in/express = 0). */
function beforeBufferFor(fulfillment: FulfillmentMethod, policyBefore: number | null): number {
  return fulfillment === "standard" ? (policyBefore ?? 0) : 0;
}

export type AssignableUnit = { id: string; code: string; free: boolean };

/**
 * Seller-side: which physical units of a variant can be assigned to a booking
 * over [startDate, endDate]. `free` is false for units held by an overlapping
 * blocking booking or closed (per-code blackout) inside the buffered window.
 */
export async function getAssignableUnits(
  productId: string,
  variantId: string,
  startDate: string,
  endDate: string,
  fulfillment: FulfillmentMethod,
): Promise<Result<{ units: AssignableUnit[]; quantity: number }>> {
  const access = await requireShopAccess({ need: "bookings" }).catch(() => null);
  if (!access) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    return { ok: false, error: "วันที่ไม่ถูกต้อง" };
  if (endDate < startDate) return { ok: false, error: "วันคืนต้องไม่ก่อนวันรับ" };

  const product = await db.product.findUnique({
    where: { id: productId },
    select: PRODUCT_POLICY_SELECT,
  });
  if (!product || product.shopId !== access.shopId) return { ok: false, error: "ไม่พบสินค้า" };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, size: true, quantity: true, productId: true },
  });
  if (!variant || variant.productId !== product.id) return { ok: false, error: "ไม่พบไซซ์ที่เลือก" };

  await syncVariantUnits(variant.id, variant.size, product.slug, variant.quantity);

  const policy = resolveEffectivePolicy(product.shop, product);
  const before = beforeBufferFor(fulfillment, policy.bufferDaysBefore);
  const after = policy.bufferDaysAfter;
  const win = bookingWindow(startDate, endDate, before, after);

  const allUnits = await db.productUnit.findMany({
    where: { variantId, status: { in: ["available", "rented"] } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });
  const blocked = await blockedUnitDatesInRange(db, variantId, win.winStart, win.winEnd);
  const blockedIds = new Set(blocked.map((b) => b.unitId));
  const holdRows = await db.bookingItem.findMany({
    where: {
      variantId,
      unitId: { not: null },
      booking: { status: { in: [...BOOKING_BLOCKING_STATUSES] } },
    },
    select: { unitId: true, booking: { select: { startDate: true, endDate: true } } },
  });
  const holds = holdRows.map((h) => ({
    unitId: h.unitId as string,
    ...bookingWindow(ymd(h.booking.startDate), ymd(h.booking.endDate), before, after),
  }));

  const units = allUnits.map((u) => {
    const closed = blockedIds.has(u.id);
    const taken = holds.some(
      (h) => h.unitId === u.id && windowsOverlap(h.winStart, h.winEnd, win.winStart, win.winEnd),
    );
    return { id: u.id, code: u.code, free: !closed && !taken };
  });

  return { ok: true, units, quantity: variant.quantity };
}

/**
 * Item shape accepted in the optional `items` JSON field for multi-item manual booking.
 * unitId "" / "auto" / null → system picks; a uuid → seller's explicit pick.
 */
export type ManualBookingItemInput = {
  productId: string;
  variantId: string | null;
  unitId: string | null;
};

export async function createManualBooking(formData: FormData): Promise<Result<{ id: string }>> {
  const access = await requireShopAccess({ need: "bookings" }).catch(() => null);
  if (!access) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();
  const internalNote = String(formData.get("internal_note") ?? "").trim() || null;
  const customTotal = String(formData.get("custom_total") ?? "").trim();
  const fulfillmentRaw = String(formData.get("fulfillment") ?? "walk_in").trim();
  const fulfillment = (["walk_in", "express", "standard"].includes(fulfillmentRaw)
    ? fulfillmentRaw
    : "walk_in") as "walk_in" | "express" | "standard";
  const shippingAddress = String(formData.get("shipping_address") ?? "").trim();

  if (!startDate || !endDate) return { ok: false, error: "กรุณาเลือกวันเช่า" };
  if (endDate < startDate) return { ok: false, error: "วันคืนต้องไม่ก่อนวันรับ" };
  if (!customerName) return { ok: false, error: "กรุณาใส่ชื่อลูกค้า" };
  if (fulfillment !== "walk_in" && !shippingAddress)
    return { ok: false, error: "กรุณาใส่ที่อยู่จัดส่ง" };

  // ── Normalize into a lineItems array ──────────────────────────────────────
  // When `items` JSON is present, parse it (multi-item path).
  // Otherwise fall back to single-field parsing (legacy back-compat).
  const itemsJson = String(formData.get("items") ?? "").trim();
  let lineItems: ManualBookingItemInput[];
  if (itemsJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(itemsJson);
    } catch {
      return { ok: false, error: "รูปแบบรายการสินค้าไม่ถูกต้อง" };
    }
    if (!Array.isArray(parsed) || parsed.length === 0)
      return { ok: false, error: "รายการสินค้าต้องมีอย่างน้อย 1 รายการ" };
    lineItems = (parsed as ManualBookingItemInput[]).map((it) => ({
      productId: String(it.productId ?? "").trim(),
      variantId: it.variantId ? String(it.variantId).trim() : null,
      unitId: it.unitId ? String(it.unitId).trim() || null : null,
    }));
    if (lineItems.some((it) => !it.productId))
      return { ok: false, error: "รายการสินค้าไม่ครบถ้วน" };
  } else {
    // Legacy single-field path.
    const productId = String(formData.get("product_id") ?? "").trim();
    const variantId = String(formData.get("variant_id") ?? "").trim() || null;
    // "" / "auto" → let the system pick the lowest free unit; a uuid → seller chose.
    const chosenUnitId = String(formData.get("unit_id") ?? "").trim() || null;
    if (!productId) return { ok: false, error: "กรุณาเลือกสินค้า" };
    lineItems = [{ productId, variantId, unitId: chosenUnitId }];
  }

  // Validate: all products must belong to this seller's shop.
  const distinctProductIds = [...new Set(lineItems.map((it) => it.productId))];
  const products = await db.product.findMany({
    where: { id: { in: distinctProductIds } },
    select: {
      id: true,
      slug: true,
      shopId: true,
      pricePerDay: true,
      deposit: true,
      policyOverride: true,
      leadTimeDays: true,
      minRentalDays: true,
      maxRentalDays: true,
      returnWindowDays: true,
      bufferDaysAfter: true,
      bufferDaysBefore: true,
      shop: {
        select: {
          leadTimeDays: true,
          minRentalDays: true,
          maxRentalDays: true,
          returnWindowDays: true,
          bufferDaysAfter: true,
          bufferDaysBefore: true,
          closedWeekdays: true,
        },
      },
      priceTiers: {
        orderBy: { minDays: "asc" },
        select: { minDays: true, pricePerDay: true },
      },
    },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const li of lineItems) {
    const p = productById.get(li.productId);
    if (!p) return { ok: false, error: "ไม่พบสินค้า" };
    if (p.shopId !== access.shopId) return { ok: false, error: "สินค้านี้ไม่ใช่ของร้านคุณ" };
  }

  const days = rentalDays(startDate, endDate);

  // ── Per-item: resolve variant + compute pricing ───────────────────────────
  type ResolvedManualItem = {
    productId: string;
    variantId: string | null;
    chosenUnitId: string | null; // seller's explicit unit pick (null = auto)
    rentalTotal: number;
    deposit: number;
    hasVariant: boolean;
    bufferBefore: number;
    bufferAfter: number;
  };

  const resolvedItems: ResolvedManualItem[] = [];

  for (const li of lineItems) {
    const product = productById.get(li.productId)!;

    let variantPricePerDay = product.pricePerDay;
    let variantDeposit = product.deposit;

    if (li.variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: li.variantId },
        select: { id: true, productId: true, size: true, quantity: true, pricePerDay: true, deposit: true, available: true },
      });
      if (!variant || variant.productId !== product.id)
        return { ok: false, error: "ไม่พบไซซ์ที่เลือก" };
      variantPricePerDay = variant.pricePerDay;
      variantDeposit = variant.deposit;
      // Seed serialized units for legacy variants that have none yet.
      await syncVariantUnits(variant.id, variant.size, product.slug, variant.quantity);
    }

    const tiers = normalizeTiers(
      product.priceTiers.map((t, i) => ({
        min: t.minDays,
        max: i < product.priceTiers.length - 1 ? product.priceTiers[i + 1].minDays - 1 : null,
        per_day: t.pricePerDay,
      })),
    );
    const perItemCalcTotal = priceForNights(tiers, variantPricePerDay, days).total;

    const policy = resolveEffectivePolicy(product.shop, product);
    const bufferBefore = fulfillment === "standard" ? (policy.bufferDaysBefore ?? 0) : 0;
    const bufferAfter = policy.bufferDaysAfter;

    resolvedItems.push({
      productId: product.id,
      variantId: li.variantId,
      chosenUnitId: li.unitId,
      rentalTotal: perItemCalcTotal,
      deposit: variantDeposit,
      hasVariant: !!li.variantId,
      bufferBefore,
      bufferAfter,
    });
  }

  // custom_total is only honored when exactly ONE line item.
  const sumCalculatedTotal = resolvedItems.reduce((s, it) => s + it.rentalTotal, 0);
  const isSingleItem = resolvedItems.length === 1;
  const rentalTotal = isSingleItem && customTotal
    ? Math.round(Number(customTotal))
    : sumCalculatedTotal;
  if (!Number.isFinite(rentalTotal) || rentalTotal < 0)
    return { ok: false, error: "ยอดเช่าไม่ถูกต้อง" };
  // A single-item custom total overrides that one item's rental too, so the
  // BookingItem row stays consistent with the header (matches legacy behavior).
  if (isSingleItem && customTotal) resolvedItems[0].rentalTotal = rentalTotal;

  const sumDeposit = resolvedItems.reduce((s, it) => s + it.deposit, 0);

  const deliveryMethod = fulfillment === "walk_in" ? null : fulfillment;
  const addressText = fulfillment === "walk_in" ? "รับหน้าร้าน" : shippingAddress;
  const isWalkIn = fulfillment === "walk_in";
  const initialStatus = isWalkIn ? ("renting" as const) : ("confirmed" as const);

  const bookingHeaderData = {
    renterId: user.id,
    shopId: access.shopId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    rentalTotal,
    deposit: sumDeposit,
    commissionRate: PLATFORM_COMMISSION_RATE,
    commissionAmount: commissionAmount(rentalTotal),
    status: initialStatus,
    source: "walk_in",
    deliveryMethod,
    internalNote,
    recipientName: customerName,
    phone: customerPhone || null,
    addressText,
  };

  return withActor(user.id, async () => {
    try {
      const result = await db.$transaction(async (tx) => {
        // Lock all distinct variant rows in sorted order (deadlock avoidance).
        const variantItems = resolvedItems.filter((it) => it.hasVariant);
        const distinctVariantIds = [...new Set(variantItems.map((it) => it.variantId!))].sort();
        for (const vId of distinctVariantIds) {
          await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${vId}::uuid FOR UPDATE`;
        }

        // Per-item unit assignment. Track in-transaction holds per variant so two
        // items of the same variant in this booking don't grab the same unit
        // (mirrors the acceptBooking pattern in bookings.ts).
        type Hold = { unitId: string; winStart: string; winEnd: string };
        const extraHoldsByVariant = new Map<string, Hold[]>();
        const assignedUnits: { productId: string; variantId: string | null; unitId: string | null; rentalTotal: number; deposit: number }[] = [];

        for (const item of resolvedItems) {
          if (!item.hasVariant) {
            // No-variant item: include with no unit assignment.
            assignedUnits.push({
              productId: item.productId,
              variantId: null,
              unitId: null,
              rentalTotal: item.rentalTotal,
              deposit: item.deposit,
            });
            continue;
          }

          const vId = item.variantId!;
          const win = bookingWindow(startDate, endDate, item.bufferBefore, item.bufferAfter);

          const allUnits = await tx.productUnit.findMany({
            where: { variantId: vId, status: { in: ["available", "rented"] } },
            select: { id: true, code: true },
            orderBy: { code: "asc" },
          });
          const blocked = await blockedUnitDatesInRange(tx, vId, win.winStart, win.winEnd);
          const blockedIds = new Set(blocked.map((b) => b.unitId));
          const units = allUnits.filter((u) => !blockedIds.has(u.id));

          // DB holds from OTHER committed bookings for this variant.
          const dbHoldRows = await tx.bookingItem.findMany({
            where: {
              variantId: vId,
              unitId: { not: null },
              booking: { status: { in: [...BOOKING_BLOCKING_STATUSES] } },
            },
            select: { unitId: true, booking: { select: { startDate: true, endDate: true } } },
          });
          const dbHolds: Hold[] = dbHoldRows.map((h) => ({
            unitId: h.unitId as string,
            ...bookingWindow(ymd(h.booking.startDate), ymd(h.booking.endDate), item.bufferBefore, item.bufferAfter),
          }));

          // Combine DB holds with units already chosen earlier in this transaction
          // for the same variant (so two items in the same cart never get the same unit).
          const holds: Hold[] = [...dbHolds, ...(extraHoldsByVariant.get(vId) ?? [])];

          let unitId: string | null = null;
          if (item.chosenUnitId) {
            // Seller picked a specific unit — honour it only if it's assignable + free.
            const candidate = units.find((u) => u.id === item.chosenUnitId);
            const taken =
              !!candidate &&
              holds.some(
                (h) =>
                  h.unitId === item.chosenUnitId &&
                  windowsOverlap(h.winStart, h.winEnd, win.winStart, win.winEnd),
              );
            if (!candidate || taken) return { ok: false as const, reason: "unit_taken" as const };
            unitId = item.chosenUnitId;
          } else {
            unitId = pickFreeUnit(units, holds, win.winStart, win.winEnd);
            if (!unitId) return { ok: false as const, reason: "full" as const };
          }

          // Record this assignment so the next item for the same variant won't pick it.
          const arr = extraHoldsByVariant.get(vId) ?? [];
          arr.push({ unitId, winStart: win.winStart, winEnd: win.winEnd });
          extraHoldsByVariant.set(vId, arr);

          assignedUnits.push({
            productId: item.productId,
            variantId: vId,
            unitId,
            rentalTotal: item.rentalTotal,
            deposit: item.deposit,
          });
        }

        // Create the booking with all items.
        const booking = await tx.booking.create({
          data: {
            ...bookingHeaderData,
            items: {
              create: assignedUnits.map((u) => ({
                productId: u.productId,
                ...(u.variantId ? { variantId: u.variantId } : {}),
                ...(u.unitId ? { unitId: u.unitId } : {}),
                rentalTotal: u.rentalTotal,
                deposit: u.deposit,
              })),
            },
          },
          select: { id: true },
        });

        // Walk-in: flip all assigned units to 'rented' right away.
        if (isWalkIn) {
          const unitIdsToRent = assignedUnits.map((u) => u.unitId).filter((id): id is string => !!id);
          if (unitIdsToRent.length > 0) {
            await tx.productUnit.updateMany({
              where: { id: { in: unitIdsToRent } },
              data: { status: "rented" },
            });
          }
        }

        return { ok: true as const, id: booking.id };
      });

      if (!result.ok)
        return {
          ok: false,
          error:
            result.reason === "unit_taken"
              ? "ตัวที่เลือกถูกจองหรือปิดในช่วงเวลานี้แล้ว กรุณาเลือกตัวอื่น"
              : "ไซซ์นี้ถูกจองเต็มในช่วงเวลานี้แล้ว",
        };
      revalidatePath("/sell/bookings");
      return { ok: true, id: result.id };
    } catch (e) {
      console.error("[doprent] createManualBooking error", e);
      return { ok: false, error: "สร้างการจองไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }
  });
}

