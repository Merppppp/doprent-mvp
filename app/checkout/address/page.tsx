import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyAddresses } from "@/lib/booking-queries";
import { rentalDays } from "@/lib/bookings";
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

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(backHref)}`);

  if (!dressId || !start || !end) {
    return <Fallback msg="ลิงก์การจองไม่สมบูรณ์ กรุณาเลือกชุดและวันที่จากหน้าชุดอีกครั้ง" />;
  }

  const { data: dress } = await sb
    .from("dresses")
    .select("id,name,slug,images,price_per_day,deposit,status,available,boutique_name")
    .eq("id", dressId)
    .maybeSingle();

  if (!dress) return <Fallback msg="ไม่พบชุดนี้" />;
  if (dress.status !== "live" || !dress.available)
    return <Fallback msg="ชุดนี้ยังไม่เปิดให้จองในขณะนี้" />;

  const days = rentalDays(start, end);
  const image = Array.isArray(dress.images) && dress.images.length > 0 ? dress.images[0] : null;
  const addresses = await getMyAddresses();

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 640 }}>
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
            ฿{Number(dress.price_per_day).toLocaleString()} / วัน
          </div>
        </div>
      </div>

      <CheckoutForm
        dressId={dress.id}
        startDate={start}
        endDate={end}
        days={days}
        pricePerDay={Number(dress.price_per_day)}
        deposit={Number(dress.deposit) || 0}
        addresses={addresses}
      />
    </div>
  );
}

function Fallback({ msg }: { msg: string }) {
  return (
    <div className="shell" style={{ paddingTop: 80, paddingBottom: 100, maxWidth: 520, textAlign: "center" }}>
      <p style={{ fontSize: 16, color: "var(--ink-2)", marginBottom: 22 }}>{msg}</p>
      <Link href="/browse" className="btn btn-dark" style={{ padding: "12px 22px" }}>
        เลือกชุด
      </Link>
    </div>
  );
}
