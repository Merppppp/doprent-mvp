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
import ManualBookingForm, { type CatalogProduct } from "@/components/ManualBookingForm";
import SellerStockChecker from "@/components/SellerStockChecker";
import { todayBkk } from "@/lib/date-th";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "จองหน้าร้าน",
  robots: { index: false, follow: false },
};

type ProductForVariantOptions = {
  id: string;
  policyOverride: boolean;
  leadTimeDays: number | null;
  minRentalDays: number | null;
  maxRentalDays: number | null;
  returnWindowDays: number | null;
  bufferDaysAfter: number | null;
  bufferDaysBefore: number | null;
  shop: {
    leadTimeDays: number;
    minRentalDays: number;
    maxRentalDays: number | null;
    returnWindowDays: number;
    bufferDaysAfter: number;
    bufferDaysBefore: number;
    closedWeekdays: number[];
    closedDates: { date: Date }[];
  };
  variants: {
    id: string;
    size: string;
    quantity: number;
    pricePerDay: number;
    deposit: number;
    available: boolean;
  }[];
};

// ─── helper: build variantOptions for a product (shared between entry & catalog) ───
async function buildVariantOptions(
  product: ProductForVariantOptions,
  rangeStart: string,
  rangeEnd: string,
) {
  const blackouts = await listBlackouts(product.id, "all");

  const effectivePolicy = resolveEffectivePolicy(
    {
      leadTimeDays: product.shop.leadTimeDays,
      minRentalDays: product.shop.minRentalDays,
      maxRentalDays: product.shop.maxRentalDays,
      returnWindowDays: product.shop.returnWindowDays,
      bufferDaysAfter: product.shop.bufferDaysAfter,
      bufferDaysBefore: product.shop.bufferDaysBefore,
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
    },
  );

  const activeBookings = await db.bookingItem
    .findMany({
      where: {
        productId: product.id,
        booking: { status: { in: ["booking_pending", "waiting_for_payment", "payment_review", "confirmed", "renting", "awaiting_return"] } },
      },
      select: {
        variantId: true,
        booking: { select: { startDate: true, endDate: true, status: true } },
      },
    })
    .then((itemRows) =>
      itemRows.map((it) => ({
        startDate: it.booking.startDate,
        endDate: it.booking.endDate,
        status: it.booking.status,
        variantId: it.variantId,
      })),
    );

  const productWideBlackouts = blackouts.filter((b) => b.variantId === null).map((b) => b.date);
  const variantBlackoutMap = new Map<string, string[]>();
  for (const b of blackouts) {
    if (b.variantId) {
      const arr = variantBlackoutMap.get(b.variantId) ?? [];
      arr.push(b.date);
      variantBlackoutMap.set(b.variantId, arr);
    }
  }

  const shopClosedDates = product.shop.closedDates.map((d) => d.date.toISOString().slice(0, 10));

  const unavailableSet = computeUnavailableDates({
    blackouts: productWideBlackouts,
    shopClosedDates,
    bookings: activeBookings.map((b) => ({ startDate: b.startDate, endDate: b.endDate, status: b.status })),
    effectivePolicy,
    rangeStart,
    rangeEnd,
  });

  const ACTIVE_STATUSES = new Set(["booking_pending", "waiting_for_payment", "payment_review", "confirmed", "renting", "awaiting_return"]);

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
      shopClosedDates,
      bookings: variantBookings.map((b) => ({ startDate: b.startDate, endDate: b.endDate, status: b.status })),
      effectivePolicy,
      rangeStart,
      rangeEnd,
      quantity: v.quantity,
    });

    return {
      id: v.id,
      size: v.size,
      quantity: v.quantity,
      pricePerDay: v.pricePerDay,
      deposit: v.deposit,
      available: v.available,
      unavailable: Array.from(variantUnavailableSet).filter((d) => !unavailableSet.has(d)).sort(),
    };
  });

  return { variantOptions, unavailableSet };
}

export default async function ManualBookingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { start?: string; end?: string; variant?: string };
}) {
  const access = await requireShopAccess({ need: "bookings" }).catch(() => null);
  if (!access) redirect(`/login?next=/sell/products/${params.id}/manual-booking`);

  const PRODUCT_SELECT = {
    id: true,
    name: true,
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
    status: true,
    available: true,
    images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
    variants: {
      where: { available: true },
      orderBy: { size: "asc" as const },
      select: { id: true, size: true, quantity: true, pricePerDay: true, deposit: true, available: true },
    },
    shop: {
      select: {
        leadTimeDays: true,
        minRentalDays: true,
        maxRentalDays: true,
        returnWindowDays: true,
        bufferDaysAfter: true,
        bufferDaysBefore: true,
        closedWeekdays: true,
        closedDates: { select: { date: true } },
      },
    },
  } as const;

  const product = await db.product.findUnique({
    where: { id: params.id },
    select: PRODUCT_SELECT,
  });

  if (!product || product.shopId !== access.shopId) notFound();

  const rangeStart = new Date().toISOString().slice(0, 10);
  const rangeEnd = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 180);
    return d.toISOString().slice(0, 10);
  })();

  // Build variant options for the entry product
  const { variantOptions, unavailableSet } = await buildVariantOptions(
    product as unknown as ProductForVariantOptions,
    rangeStart,
    rangeEnd,
  );

  // Pre-seed from a calendar click. Only honour a start date that's a valid,
  // in-window, currently-available day so we never seed an unselectable date.
  const ymdRe = /^\d{4}-\d{2}-\d{2}$/;
  const seedVariant =
    searchParams.variant && variantOptions.some((v) => v.id === searchParams.variant && v.available)
      ? searchParams.variant
      : undefined;
  const seedVariantUnavailable = new Set(
    seedVariant ? variantOptions.find((v) => v.id === seedVariant)?.unavailable ?? [] : [],
  );
  const seedStart =
    searchParams.start &&
    ymdRe.test(searchParams.start) &&
    searchParams.start >= rangeStart &&
    searchParams.start <= rangeEnd &&
    !unavailableSet.has(searchParams.start) &&
    !seedVariantUnavailable.has(searchParams.start)
      ? searchParams.start
      : undefined;

  // ── Catalog: other live, available products from the same shop ─────────────
  const catalogRaw = await db.product.findMany({
    where: {
      shopId: access.shopId,
      id: { not: product.id },
      status: "live",
      available: true,
    },
    select: PRODUCT_SELECT,
    orderBy: { name: "asc" },
  });

  // Build variantOptions for each catalog product (parallel)
  const catalogWithVariants: CatalogProduct[] = await Promise.all(
    catalogRaw.map(async (cp) => {
      const { variantOptions: cpVariants } = await buildVariantOptions(
        cp as unknown as ProductForVariantOptions,
        rangeStart,
        rangeEnd,
      );
      return {
        id: cp.id,
        name: cp.name,
        imageUrl: cp.images[0]?.url ?? null,
        pricePerDay: cp.pricePerDay,
        deposit: cp.deposit,
        variants: cpVariants,
      };
    }),
  );

  return (
    <div className="max-w-[520px] pb-[60px]">
      <Link href="/sell/products" className="text-[13px] text-ink-3">
        ← กลับรายการสินค้า
      </Link>
      <h1 className="mt-3 mb-1.5 text-[22px] font-semibold">
        จองหน้าร้าน
      </h1>
      <p className="mb-5 text-[13px] leading-relaxed text-ink-3">
        สร้างรายการจองให้ลูกค้าหน้าร้าน — ข้ามขั้นตอนชำระเงิน เริ่มสถานะ <b>ยืนยันแล้ว</b> ทันที
      </p>
      <div className="mb-4">
        <SellerStockChecker productId={product.id} defaultDate={todayBkk()} />
      </div>
      <ManualBookingForm
        productId={product.id}
        productName={product.name}
        productImage={product.images[0]?.url ?? null}
        pricePerDay={product.pricePerDay}
        deposit={product.deposit}
        variants={variantOptions}
        unavailable={Array.from(unavailableSet).sort()}
        initialStartDate={seedStart}
        initialVariantId={seedVariant}
        catalog={catalogWithVariants}
      />
    </div>
  );
}
