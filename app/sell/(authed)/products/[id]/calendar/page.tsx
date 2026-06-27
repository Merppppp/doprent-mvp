import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listBlackouts } from "@/lib/products";
import { ACTIVE_STATUSES, BOOKING_STATUS_META } from "@/lib/bookings";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ปฏิทินวันว่าง",
  robots: { index: false, follow: false },
};

export default async function ProductCalendarPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/products/${params.id}/calendar`);

  const [shopRaw, productRaw] = await Promise.all([
    db.shop.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true, kycStatus: true },
    }),
    db.product.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, shopId: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        variants: {
          where: { available: true },
          orderBy: { size: "asc" },
          select: {
            id: true, size: true, quantity: true,
            units: { orderBy: { code: "asc" }, select: { id: true, code: true, status: true } },
          },
        },
      },
    }),
  ]);

  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }
  if (!productRaw || productRaw.shopId !== shopRaw.id) notFound();

  const allBlackouts = await listBlackouts(productRaw.id, "all");

  // Real customer bookings that hold this product's inventory, over a 13-month
  // window (current month back-edge → +12 months) so the calendar overlay covers
  // anything a seller can realistically navigate to.
  const windowStart = new Date();
  windowStart.setUTCDate(1);
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCFullYear(windowEnd.getUTCFullYear() + 1);

  const bookings = await db.bookingItem
    .findMany({
      where: {
        productId: productRaw.id,
        variantId: { not: null },
        booking: {
          status: { in: ACTIVE_STATUSES },
          startDate: { lte: windowEnd },
          endDate: { gte: windowStart },
        },
      },
      orderBy: { booking: { startDate: "asc" } },
      select: {
        variantId: true,
        unit: { select: { code: true } },
        booking: {
          select: {
            startDate: true,
            endDate: true,
            status: true,
            recipientName: true,
          },
        },
      },
    })
    .then((itemRows) =>
      itemRows.map((it) => ({
        variantId: it.variantId,
        startDate: it.booking.startDate,
        endDate: it.booking.endDate,
        status: it.booking.status,
        recipientName: it.booking.recipientName,
        unit: it.unit,
      })),
    );

  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  // variantId → { "YYYY-MM-DD": bookedCount } for the at-a-glance day chips. A
  // booking occupies every day in its inclusive [startDate, endDate] span.
  const bookedByVariant: Record<string, Record<string, number>> = {};
  // variantId → list of individual bookings (with assigned unit code) so the
  // popup can show exactly which physical unit is out and to whom.
  const bookingsByVariant: Record<
    string,
    Array<{ start: string; end: string; code: string | null; statusLabel: string; tone: string; name: string | null }>
  > = {};

  for (const b of bookings) {
    if (!b.variantId) continue;
    const map = (bookedByVariant[b.variantId] ??= {});
    const cur = new Date(b.startDate);
    const last = new Date(b.endDate);
    while (cur <= last) {
      const key = ymd(cur);
      map[key] = (map[key] ?? 0) + 1;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    const meta = BOOKING_STATUS_META[b.status];
    (bookingsByVariant[b.variantId] ??= []).push({
      start: ymd(b.startDate),
      end: ymd(b.endDate),
      code: b.unit?.code ?? null,
      statusLabel: meta?.label ?? b.status,
      tone: meta?.tone ?? "neutral",
      name: b.recipientName,
    });
  }

  // variantId → every physical unit (code + status). The popup uses this to show
  // exactly which unit codes are free vs booked on a given day. repair/retired
  // units are listed too but don't count toward rentable capacity.
  const unitsByVariant: Record<string, Array<{ id: string; code: string; status: string }>> = {};
  // Capacity = real rentable unit count (available + rented), not the loosely-kept
  // `quantity` field, so the calendar reflects actual on-hand inventory.
  const capacityByVariant: Record<string, number> = {};
  for (const v of productRaw.variants) {
    unitsByVariant[v.id] = v.units.map((u) => ({ id: u.id, code: u.code, status: u.status }));
    const rentable = v.units.filter((u) => u.status === "available" || u.status === "rented").length;
    capacityByVariant[v.id] = rentable > 0 ? rentable : v.quantity;
  }

  const variants = productRaw.variants.map((v) => ({
    id: v.id,
    label: v.size,
  }));

  // Separate product-wide vs variant-specific blackouts
  const productWideBlackouts = allBlackouts
    .filter((b) => b.variantId === null)
    .map((b) => b.date);

  const variantBlackouts: Record<string, string[]> = {};
  for (const v of variants) {
    variantBlackouts[v.id] = allBlackouts
      .filter((b) => b.variantId === v.id && b.unitId === null)
      .map((b) => b.date);
  }

  // unitId → blocked dates: per-code closures (variantId set + unitId set).
  const unitBlackouts: Record<string, string[]> = {};
  for (const b of allBlackouts) {
    if (b.unitId === null) continue;
    (unitBlackouts[b.unitId] ??= []).push(b.date);
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 640 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 4px" }}>
        ปฏิทินวันว่าง · {productRaw.name}
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        กดที่วันที่ที่สินค้านี้ <b>ไม่ว่าง</b> เพื่อบล็อกไม่ให้ลูกค้าเลือกวันนั้น เลือกแท็บไซซ์เพื่อปิดเป็นรายไซซ์
      </p>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "var(--surface)" }}>
        <AvailabilityCalendar
          productId={productRaw.id}
          variants={variants}
          initialProductBlackouts={productWideBlackouts}
          initialVariantBlackouts={variantBlackouts}
          bookedByVariant={bookedByVariant}
          capacityByVariant={capacityByVariant}
          bookingsByVariant={bookingsByVariant}
          unitsByVariant={unitsByVariant}
          initialUnitBlackouts={unitBlackouts}
        />
      </div>
      <div style={{ marginTop: 20, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
        <b>ทุกไซซ์</b> = ปิดทั้งสินค้า (ลูกค้าเลือกไซซ์ไหนก็จองวันนี้ไม่ได้)<br />
        <b>ไซซ์เฉพาะ</b> = ปิดเฉพาะไซซ์นั้น (ไซซ์อื่นยังจองได้)<br />
        <b>ป้ายไซซ์บนวัน</b> = ไซซ์ที่ <b>ลูกค้าจองจริง</b> วันนั้น (แดง = ไซซ์นั้นเต็ม)<br />
        <b>แท็บไซซ์ด้านบน</b> = เลือกดูทีละไซซ์ จะเห็น <b>จำนวนคงเหลือรายวัน</b> ของไซซ์นั้น · กดที่วันเพื่อดูรหัสตัว/สถานะ/ชื่อลูกค้า
      </div>
    </div>
  );
}
