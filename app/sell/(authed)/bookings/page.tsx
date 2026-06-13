import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getSellerBookings } from "@/lib/booking-queries";
import { expireOverdueBookings } from "@/lib/booking-expiry";
import { amountDue } from "@/lib/bookings";
import { getTrustScores } from "@/lib/trust-score";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import TrustBadge from "@/components/TrustBadge";
import { ProductArt } from "@/components/ProductArt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "การจองของร้าน",
  robots: { index: false, follow: false },
};

const fmtThai = (s: string) => {
  const [y, m, d] = s.split("-");
  return y ? `${d}/${m}/${y}` : s;
};

export default async function SellerBookingsPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/bookings");

  // Lazy payment-expiry sweep so stale waiting_for_payment rows never show.
  await expireOverdueBookings();
  const bookings = await getSellerBookings();

  // Batch trust scores: one query for all renters in this list (no N+1).
  const renterIds = [...new Set(bookings.map((b) => b.renter_id))];
  const trustScores = await getTrustScores(renterIds);
  const pending = bookings.filter(
    (b) => b.status === "booking_pending" || b.status === "payment_review"
  ).length;

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>
          การจองของร้าน
        </h1>
        {pending > 0 ? (
          <span
            style={{
              background: "var(--warn-soft)",
              color: "var(--warn)",
              fontWeight: 700,
              fontSize: 13,
              padding: "2px 10px",
              borderRadius: 999,
            }}
          >
            {pending} รอจัดการ
          </span>
        ) : null}
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-2)" }}>
          ยังไม่มีการจองเข้ามา
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((b, i) => (
            <Link
              key={b.id}
              href={`/sell/bookings/${b.id}`}
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
                ) : (
                  <ProductArt color="rose" variant={i} />
                )}
              </div>
              <div style={{ flex: 1, fontSize: 14, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{b.dress_name ?? "ชุด"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--ink-2)" }}>
                  <span>{b.recipient_name ?? ""}</span>
                  {(() => {
                    const score = trustScores.get(b.renter_id);
                    return score ? <TrustBadge score={score} /> : null;
                  })()}
                </div>
                <div style={{ color: "var(--ink-3)", fontSize: 12.5, marginTop: 2 }}>
                  {fmtThai(b.start_date)} – {fmtThai(b.end_date)} · ฿{amountDue(b).toLocaleString()}
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
