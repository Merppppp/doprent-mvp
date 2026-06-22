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

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export async function createManualBooking(formData: FormData): Promise<Result<{ id: string }>> {
  const access = await requireShopAccess({ need: "bookings" }).catch(() => null);
  if (!access) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ยังไม่ได้เข้าสู่ระบบ" };

  const productId = String(formData.get("product_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim() || null;
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();
  const internalNote = String(formData.get("internal_note") ?? "").trim() || null;
  const customTotal = String(formData.get("custom_total") ?? "").trim();

  if (!productId) return { ok: false, error: "กรุณาเลือกสินค้า" };
  if (!startDate || !endDate) return { ok: false, error: "กรุณาเลือกวันเช่า" };
  if (endDate < startDate) return { ok: false, error: "วันคืนต้องไม่ก่อนวันรับ" };
  if (!customerName) return { ok: false, error: "กรุณาใส่ชื่อลูกค้า" };

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      shopId: true,
      pricePerDay: true,
      deposit: true,
      priceTiers: {
        orderBy: { minDays: "asc" },
        select: { minDays: true, pricePerDay: true },
      },
    },
  });
  if (!product) return { ok: false, error: "ไม่พบสินค้า" };
  if (product.shopId !== access.shopId) return { ok: false, error: "สินค้านี้ไม่ใช่ของร้านคุณ" };

  let variantPricePerDay = product.pricePerDay;
  let variantDeposit = product.deposit;

  if (variantId) {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, productId: true, pricePerDay: true, deposit: true, available: true },
    });
    if (!variant || variant.productId !== product.id)
      return { ok: false, error: "ไม่พบไซซ์ที่เลือก" };
    variantPricePerDay = variant.pricePerDay;
    variantDeposit = variant.deposit;
  }

  const days = rentalDays(startDate, endDate);
  const tiers = normalizeTiers(
    product.priceTiers.map((t, i) => ({
      min: t.minDays,
      max: i < product.priceTiers.length - 1 ? product.priceTiers[i + 1].minDays - 1 : null,
      per_day: t.pricePerDay,
    })),
  );
  const calculatedTotal = priceForNights(tiers, variantPricePerDay, days).total;
  const rentalTotal = customTotal ? Math.round(Number(customTotal)) : calculatedTotal;
  if (!Number.isFinite(rentalTotal) || rentalTotal < 0)
    return { ok: false, error: "ยอดเช่าไม่ถูกต้อง" };

  return withActor(user.id, async () => {
    const booking = await db.booking.create({
      data: {
        renterId: user.id,
        shopId: access.shopId,
        productId: product.id,
        variantId: variantId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rentalTotal,
        deposit: variantDeposit,
        commissionRate: PLATFORM_COMMISSION_RATE,
        commissionAmount: commissionAmount(rentalTotal),
        status: "confirmed",
        source: "walk_in",
        internalNote,
        recipientName: customerName,
        phone: customerPhone || null,
        addressText: "รับหน้าร้าน",
      },
      select: { id: true },
    });

    revalidatePath("/sell/bookings");
    return { ok: true, id: booking.id };
  });
}

