import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requireShopAccess } from "@/lib/shop-access";
import { db } from "@/lib/db";
import { listBlackouts } from "@/lib/products";
import {
  resolveEffectivePolicy,
  computeUnavailableDates,
} from "@/lib/booking-policy";
import ManualBookingForm from "@/components/ManualBookingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "จองหน้าร้าน",
  robots: { index: false, follow: false },
};

export default async function ManualBookingPage({ params }: { params: { id: string } }) {
  const access = await requireShopAccess({ need: "bookings" }).catch(() => null);
  if (!access) redirect(`/login?next=/sell/products/${params.id}/manual-booking`);

  const product = await db.product.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      shopId: true,
      pricePerDay: true,
      deposit: true,
      policyOverride: true,
      leadTimeDays: true,
      minRentalDays: true,
      maxRentalDays: true,
      returnWindowDays: true,
      bufferDaysAfter: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: {
        where: { available: true },
        orderBy: { size: "asc" },
        select: { id: true, size: true, quantity: true, pricePerDay: true, deposit: true, available: true },
      },
      shop: {
        select: {
          leadTimeDays: true,
          minRentalDays: true,
          maxRentalDays: true,
          returnWindowDays: true,
          bufferDaysAfter: true,
          closedWeekdays: true,
          closedDates: { select: { date: true } },
        },
      },
    },
  });

  if (!product || product.shopId !== access.shopId) notFound();

  const blackouts = await listBlackouts(product.id, "all");

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

  const activeBookings = await db.booking.findMany({
    where: {
      productId: product.id,
      status: { in: ["booking_pending", "waiting_for_payment", "payment_review", "confirmed", "renting"] },
    },
    select: { startDate: true, endDate: true, status: true, variantId: true },
  });

  const rangeStart = new Date().toISOString().slice(0, 10);
  const rangeEnd = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 180);
    return d.toISOString().slice(0, 10);
  })();

  const productWideBlackouts = blackouts.filter((b) => b.variantId === null).map((b) => b.date);
  const variantBlackoutMap = new Map<string, string[]>();
  for (const b of blackouts) {
    if (b.variantId) {
      const arr = variantBlackoutMap.get(b.variantId) ?? [];
      arr.push(b.date);
      variantBlackoutMap.set(b.variantId, arr);
    }
  }

  const unavailableSet = computeUnavailableDates({
    blackouts: productWideBlackouts,
    shopClosedDates: product.shop.closedDates.map((d) => d.date.toISOString().slice(0, 10)),
    bookings: activeBookings.map((b) => ({ startDate: b.startDate, endDate: b.endDate, status: b.status })),
    effectivePolicy,
    rangeStart,
    rangeEnd,
  });

  const ACTIVE_STATUSES = new Set(["booking_pending", "waiting_for_payment", "payment_review", "confirmed", "renting"]);

  const variantOptions = product.variants.map((v) => {
    const variantBookings = activeBookings.filter(
      (b) => ACTIVE_STATUSES.has(b.status) && (b.variantId === v.id || b.variantId === null),
    );
    const variantSpecificBlackouts = [
      ...productWideBlackouts,
      ...(variantBlackoutMap.get(v.id) ?? []),
    ];
    const variantUnavailableSet = computeUnavailableDates({
      blackouts: variantSpecificBlackouts,
      shopClosedDates: product.shop.closedDates.map((d) => d.date.toISOString().slice(0, 10)),
      bookings: variantBookings.map((b) => ({ startDate: b.startDate, endDate: b.endDate, status: b.status })),
      effectivePolicy,
      rangeStart,
      rangeEnd,
      quantity: v.quantity,
    });

    return {
      id: v.id,
      size: v.size,
      pricePerDay: v.pricePerDay,
      deposit: v.deposit,
      available: v.available,
      unavailable: Array.from(variantUnavailableSet).filter((d) => !unavailableSet.has(d)).sort(),
    };
  });

  return (
    <div style={{ maxWidth: 520, paddingBottom: 60 }}>
      <Link href="/sell/products" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        ← กลับรายการสินค้า
      </Link>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "12px 0 6px" }}>
        จองหน้าร้าน
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        สร้างรายการจองให้ลูกค้าหน้าร้าน — ข้ามขั้นตอนชำระเงิน เริ่มสถานะ <b>ยืนยันแล้ว</b> ทันที
      </p>
      <ManualBookingForm
        productId={product.id}
        productName={product.name}
        productImage={product.images[0]?.url ?? null}
        pricePerDay={product.pricePerDay}
        deposit={product.deposit}
        variants={variantOptions}
        unavailable={Array.from(unavailableSet).sort()}
      />
    </div>
  );
}
