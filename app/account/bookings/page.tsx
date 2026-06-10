import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getRenterBookings } from "@/lib/booking-queries";
import { amountDue } from "@/lib/bookings";
import BookingStatusBadge from "@/components/BookingStatusBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "การจองของฉัน",
  robots: { index: false, follow: false },
};

const fmtThai = (s: string) => {
  const [y, m, d] = s.split("-");
  return y ? `${d}/${m}/${y}` : s;
};

export default async function MyBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/bookings");

  const bookings = await getRenterBookings();

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 720 }}>
      <h1
        className="page-title"
        style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 20 }}
      >
        การจองของฉัน
      </h1>

      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-2)" }}>
          <p style={{ marginBottom: 20 }}>ยังไม่มีการจอง</p>
          <Link href="/" className="btn btn-dark" style={{ padding: "12px 22px" }}>
            เริ่มเลือกชุด
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/account/bookings/${b.id}`}
              className="hover-lift"
              style={{
                display: "flex",
                gap: 14,
                padding: 14,
                border: "1px solid var(--line)",
                borderRadius: 12,
                background: "var(--surface)",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 66,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "var(--accent-soft)",
                }}
              >
                {b.dress_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.dress_image} alt={b.dress_name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>
              <div style={{ flex: 1, fontSize: 14, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{b.dress_name ?? "ชุด"}</div>
                <div style={{ color: "var(--ink-2)" }}>{b.boutique_name}</div>
                <div style={{ color: "var(--ink-3)", fontSize: 12.5, marginTop: 2 }}>
                  {fmtThai(b.start_date)} – {fmtThai(b.end_date)} · ฿
                  {amountDue(b).toLocaleString()}
                  {b.shipping_fee == null ? " (ยังไม่รวมค่าส่ง)" : ""}
                </div>
              </div>
              <BookingStatusBadge status={b.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
