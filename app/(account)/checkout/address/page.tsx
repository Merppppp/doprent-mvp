import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyAddresses, getMyBankAccounts } from "@/lib/booking-queries";
import { rentalDays } from "@/lib/bookings";
import { hasMultipleRates, normalizeTiers, startingPerDay } from "@/lib/pricing";
import { parseBusinessHours } from "@/lib/hours";
import CheckoutForm from "@/components/CheckoutForm";
import { getUserIdCards } from "@/app/actions/id-cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ยืนยันการจอง",
  robots: { index: false, follow: false },
};

type SP = { product?: string; dress?: string; start?: string; end?: string; variant?: string; startTime?: string; endTime?: string; outbound?: string; return?: string };

const isShipMethod = (s: string | undefined): s is "express" | "standard" =>
  s === "express" || s === "standard";

const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export default async function CheckoutAddressPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  // `?dress=` accepted as a legacy alias during the rename deploy window.
  const productId = searchParams.product ?? searchParams.dress ?? "";
  const start = searchParams.start ?? "";
  const end = searchParams.end ?? "";
  const variantId = searchParams.variant ?? null;
  // Optional pickup/return time-of-day. Only honoured when both are valid HH:MM;
  // otherwise the booking is treated as full-day (null times).
  const startTime = searchParams.startTime && isHHMM(searchParams.startTime) ? searchParams.startTime : null;
  const endTime = searchParams.endTime && isHHMM(searchParams.endTime) ? searchParams.endTime : null;
  const timeQuery = startTime && endTime ? `&startTime=${startTime}&endTime=${endTime}` : "";
  // Shipping methods picked on the calendar page. Default to standard (worst case).
  const outboundMethod = isShipMethod(searchParams.outbound) ? searchParams.outbound : "standard";
  const returnMethod = isShipMethod(searchParams.return) ? searchParams.return : "standard";
  const shipQuery = `&outbound=${outboundMethod}&return=${returnMethod}`;

  const backHref = `/checkout/address?product=${productId}&start=${start}&end=${end}${variantId ? `&variant=${variantId}` : ""}${timeQuery}${shipQuery}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(backHref)}`);

  if (!productId || !start || !end) {
    return <Fallback msg="ลิงก์การจองไม่สมบูรณ์ กรุณาเลือกชุดและวันที่จากหน้าชุดอีกครั้ง" />;
  }

  const row = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      pricePerDay: true,
      priceTiers: { orderBy: { minDays: "asc" }, select: { minDays: true, pricePerDay: true } },
      deposit: true,
      status: true,
      available: true,
      shop: { select: { name: true, hours: true, isOpen: true } },
    },
  });
  const shopHours = row ? parseBusinessHours(row.shop.hours) : null;
  const dress = row
    ? {
        id: row.id,
        name: row.name,
        slug: row.slug,
        images: row.images.map((img) => img.url),
        price_per_day: row.pricePerDay,
        price_tiers: row.priceTiers.map((t, i) => ({
          min: t.minDays,
          max: i < row.priceTiers.length - 1 ? row.priceTiers[i + 1].minDays - 1 : null,
          per_day: t.pricePerDay,
        })),
        deposit: row.deposit,
        status: row.status,
        available: row.available,
        boutique_name: row.shop.name,
        shop_is_open: row.shop.isOpen,
      }
    : null;

  if (!dress) return <Fallback msg="ไม่พบชุดนี้" />;
  if (dress.status !== "live" || !dress.available)
    return <Fallback msg="ชุดนี้ยังไม่เปิดให้จองในขณะนี้" />;

  const days = rentalDays(start, end);
  const image =
    Array.isArray(dress.images) && dress.images.length > 0 ? String(dress.images[0]) : null;
  const [addresses, bankAccounts, idCards] = await Promise.all([
    getMyAddresses(),
    getMyBankAccounts(),
    getUserIdCards(),
  ]);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 640 }}>
      <Link href={`/product/${dress.slug}`} style={{ fontSize: 14, color: "var(--ink-3)" }}>
        ← กลับไปหน้าชุด
      </Link>
      <h1
        className="page-title"
        style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: "12px 0 20px" }}
      >
        ยืนยันการจอง
      </h1>

      {/* dress header */}
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          padding: 14,
          border: "1px solid var(--line)",
          borderRadius: 12,
          marginBottom: 22,
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 80,
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--accent-soft)",
          }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={dress.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>
        <div style={{ fontSize: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{dress.name}</div>
          <div style={{ color: "var(--ink-2)" }}>{dress.boutique_name}</div>
          <div style={{ color: "var(--ink-3)", marginTop: 2 }}>
            {hasMultipleRates(normalizeTiers(dress.price_tiers)) ? "เริ่มต้น " : ""}฿
            {startingPerDay(normalizeTiers(dress.price_tiers), Number(dress.price_per_day)).toLocaleString()} / วัน
          </div>
        </div>
      </div>

      <CheckoutForm
        productId={dress.id}
        startDate={start}
        endDate={end}
        startTime={startTime}
        endTime={endTime}
        days={days}
        pricePerDay={Number(dress.price_per_day)}
        priceTiers={normalizeTiers(dress.price_tiers)}
        deposit={Number(dress.deposit) || 0}
        addresses={addresses}
        bankAccounts={bankAccounts}
        variantId={variantId}
        outboundMethod={outboundMethod}
        returnMethod={returnMethod}
        shopHours={shopHours}
        shopIsOpen={dress.shop_is_open}
        idCards={idCards}
      />
    </div>
  );
}

function Fallback({ msg }: { msg: string }) {
  return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 100, maxWidth: 520, textAlign: "center" }}>
      <p style={{ fontSize: 16, color: "var(--ink-2)", marginBottom: 22 }}>{msg}</p>
      <Link href="/" className="btn btn-dark" style={{ padding: "12px 22px" }}>
        เลือกชุด
      </Link>
    </div>
  );
}
