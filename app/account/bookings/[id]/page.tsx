import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForView } from "@/lib/booking-queries";
import { amountDue, BOOKING_STATUS_META } from "@/lib/bookings";
import { promptPayQrDataUrl } from "@/lib/payments";
import BookingStatusBadge from "@/components/BookingStatusBadge";
import RenterBookingActions from "@/components/RenterBookingActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "รายละเอียดการจอง",
  robots: { index: false, follow: false },
};

const fmtThai = (s: string) => {
  const [y, m, d] = s.split("-");
  return y ? `${d}/${m}/${y}` : s;
};

export default async function RenterBookingDetail({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/bookings/${params.id}`);

  const b = await getBookingForView(params.id);
  if (!b) {
    return <Fallback />;
  }
  // sellers viewing their own shop's booking belong on the seller page
  if (b.renter_id !== user.id) redirect(`/sell/bookings/${b.id}`);

  const total = amountDue(b);
  const meta = BOOKING_STATUS_META[b.status];

  // QR only while waiting for payment + shop has PromptPay + fee set
  const qr =
    b.status === "waiting_for_payment" && b.shipping_fee != null
      ? await promptPayQrDataUrl(b.boutique_promptpay_id, total)
      : null;

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 560 }}>
      <Link href="/account/bookings" style={{ fontSize: 14, color: "var(--ink-3)" }}>
        ← การจองทั้งหมด
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 6px" }}>
        <h1 className="page-title" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
          {b.dress_name ?? "การจอง"}
        </h1>
        <BookingStatusBadge status={b.status} />
      </div>
      <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 20 }}>{meta.renterHint}</p>

      {/* details */}
      <div style={card}>
        <Row label="ร้าน" value={b.boutique_name ?? "-"} />
        <Row label="วันเช่า" value={`${fmtThai(b.start_date)} – ${fmtThai(b.end_date)}`} />
        <Row label="ส่งถึง" value={`${b.recipient_name ?? ""} · ${b.phone ?? ""}`} />
        <Row label="ที่อยู่" value={b.address_text ?? "-"} />
      </div>

      <div style={card}>
        <Row label="ค่าเช่า" value={`฿${b.rental_total.toLocaleString()}`} />
        <Row label="ค่ามัดจำ" value={`฿${b.deposit.toLocaleString()}`} />
        <Row
          label="ค่าจัดส่ง"
          value={b.shipping_fee == null ? "รอร้านคำนวณ" : `฿${b.shipping_fee.toLocaleString()}`}
          muted={b.shipping_fee == null}
        />
        <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />
        <Row label="ยอดที่ต้องชำระ" value={`฿${total.toLocaleString()}`} bold />
      </div>

      {/* payment */}
      {b.status === "waiting_for_payment" ? (
        qr ? (
          <div style={{ ...card, textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>สแกนจ่ายผ่าน PromptPay</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>
              ยอด ฿{total.toLocaleString()} → {b.boutique_name}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="PromptPay QR" width={240} height={240} style={{ borderRadius: 8 }} />
            <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>
              โอนแล้วกดปุ่มด้านล่างเพื่ออัปโหลดสลิป ร้านจะตรวจและยืนยันให้
            </p>
          </div>
        ) : (
          <div style={{ ...card, color: "var(--warn)", fontSize: 14 }}>
            ร้านยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อร้าน{b.boutique_line_url ? " ผ่าน LINE" : ""}เพื่อชำระเงิน
          </div>
        )
      ) : null}

      {b.status === "confirmed" ? (
        <div style={{ ...card, background: "var(--success-soft)" }}>
          <div style={{ fontWeight: 600, color: "var(--success)", marginBottom: 4 }}>
            จองเรียบร้อย ✓
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-2)" }}>
            ร้านยืนยันการชำระเงินแล้ว นัดรับ/ส่งชุดกับร้านได้เลย
          </div>
          {b.boutique_line_url ? (
            <a
              href={b.boutique_line_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              มีคำถาม? ติดต่อร้าน (LINE)
            </a>
          ) : null}
        </div>
      ) : null}

      <RenterBookingActions bookingId={b.id} status={b.status} canPay={!!qr} />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0", fontSize: 14 }}>
      <span style={{ color: "var(--ink-3)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: muted ? "var(--ink-3)" : "var(--ink)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function Fallback() {
  return (
    <div className="shell" style={{ paddingTop: 80, paddingBottom: 100, maxWidth: 520, textAlign: "center" }}>
      <p style={{ fontSize: 16, color: "var(--ink-2)", marginBottom: 22 }}>ไม่พบการจองนี้</p>
      <Link href="/account/bookings" className="btn btn-dark" style={{ padding: "12px 22px" }}>
        การจองของฉัน
      </Link>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 16,
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--surface)",
  marginBottom: 16,
};
