import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMyAddresses } from "@/lib/booking-queries";
import { rentalDays } from "@/lib/bookings";
import { hasMultipleRates, normalizeTiers, startingPerDay } from "@/lib/pricing";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ยืนยันการจอง",
  robots: { index: false, follow: false },
};

type SP = { dress?: string; start?: string; end?: string };

export default async function CheckoutAddressPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const dressId = searchParams.dress ?? "";
  const start = searchParams.start ?? "";
  const end = searchParams.end ?? "";

  const backHref = `/checkout/address?dress=${dressId}&start=${start}&end=${end}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(backHref)}`);

  if (!dressId || !start || !end) {
    return <Fallback msg="ลิงก์การจองไม่สมบูรณ์ กรุณาเลือกชุดและวันที่จากหน้าชุดอีกครั้ง" />;
  }

  const row = await db.dress.findUnique({
    where: { id: dressId },
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      pricePerDay: true,
      priceTiers: true,
      deposit: true,
      status: true,
      available: true,
      boutiqueName: true,
    },
  });
  const dress = row
    ? {
        id: row.id,
        name: row.name,
        slug: row.slug,
        images: row.images,
        price_per_day: row.pricePerDay,
        price_tiers: row.priceTiers,
        deposit: row.deposit,
        status: row.status,
        available: row.available,
        boutique_name: row.boutiqueName,
      }
    : null;

  if (!dress) return <Fallback msg="ไม่พบชุดนี้" />;
  if (dress.status !== "live" || !dress.available)
    return <Fallback msg="ชุดนี้ยังไม่เปิดให้จองในขณะนี้" />;

  const days = rentalDays(start, end);
  const image =
    Array.isArray(dress.images) && dress.images.length > 0 ? String(dress.images[0]) : null;
  const addresses = await getMyAddresses();

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 640 }}>
      <Link href={`/dress/${dress.slug}`} style={{ fontSize: 14, color: "var(--ink-3)" }}>
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
        dressId={dress.id}
        startDate={start}
        endDate={end}
        days={days}
        pricePerDay={Number(dress.price_per_day)}
        priceTiers={normalizeTiers(dress.price_tiers)}
        deposit={Number(dress.deposit) || 0}
        addresses={addresses}
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
