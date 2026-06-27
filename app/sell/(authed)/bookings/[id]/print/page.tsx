import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForView, currentUserIsSellerOf, getBookingEffectivePolicy } from "@/lib/booking-queries";
import { bookingShippingPlan } from "@/lib/booking-policy";
import { BOOKING_STATUS_META } from "@/lib/bookings";
import { PAYMENT_CHANNEL_LABEL } from "@/lib/payments";
import { fmtThai, fmtThaiLong } from "@/lib/date-th";
import { sizeLabel } from "@/lib/types";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ใบจอง",
  robots: { index: false, follow: false },
};

function Fallback() {
  return (
    <div style={{ padding: 80, textAlign: "center", color: "#666" }}>
      ไม่พบการจองนี้
    </div>
  );
}

/** Format current server time in Asia/Bangkok timezone */
function printDateTime(): string {
  return new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PrintBookingPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/sell/bookings/${params.id}/print`);

  const b = await getBookingForView(params.id);
  if (!b) return <Fallback />;

  const isSeller = await currentUserIsSellerOf(b.boutique_id);
  if (!isSeller) redirect(`/account/bookings/${b.id}`);

  const shipPolicy = await getBookingEffectivePolicy(b.id);
  const shipPlan = shipPolicy
    ? bookingShippingPlan(shipPolicy, b.start_date, b.end_date, b.outbound_method, b.return_method)
    : null;

  const meta = BOOKING_STATUS_META[b.status];
  const ref = `#${b.id.slice(0, 8).toUpperCase()}`;
  const printedAt = printDateTime();

  const rentalTotal = b.rental_total;
  const depositTotal = b.deposit;
  const shippingFee = b.shipping_fee;
  const grandTotal = rentalTotal + depositTotal + (shippingFee ?? 0);

  // Outbound shipping text (mirrors detail page ShippingLegRow wording)
  const outboundWhen: string = (() => {
    if (!shipPlan) {
      return b.outbound_method === "express" ? "ส่งด่วน" : "ส่งพัสดุ";
    }
    const leg = shipPlan.outbound;
    if (leg.sameDay) {
      return `ส่งวันรับชุด ${fmtThaiLong(b.start_date)} ภายในวัน`;
    }
    return `เริ่มจัดส่งภายใน ${fmtThaiLong(leg.shipBy)} เผื่อขนส่ง ${leg.transitDays} วัน`;
  })();

  // Return shipping text (mirrors detail page ShippingLegRow wording)
  const returnWhen: string = (() => {
    if (!shipPlan) {
      return b.return_method === "express" ? "ส่งด่วน" : "ส่งพัสดุ";
    }
    const leg = shipPlan.return;
    if (leg.sameDay) {
      return `ลูกค้าส่งคืนวันสิ้นสุดเช่า ${fmtThaiLong(b.end_date)} ภายในวัน`;
    }
    return `ลูกค้าส่งคืนวันสิ้นสุดเช่า ${fmtThaiLong(b.end_date)} ขนส่ง ${leg.transitDays} วัน`;
  })();

  return (
    <>
      {/* Print isolation styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root { position: absolute; inset: 0; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <PrintToolbar
        backHref={`/sell/bookings/${b.id}`}
        title="ใบจอง"
      />

      <div
        id="print-root"
        style={{
          maxWidth: 640,
          margin: "32px auto",
          padding: "30px 32px",
          background: "#fff",
          color: "#1a1a1a",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.02em" }}>
              {b.boutique_name ?? "ร้านค้า"}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
              ร้านเช่าชุด
              {b.boutique_line_url ? ` · LINE: ${b.boutique_line_url}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>ใบจอง</div>
            <div style={{ fontSize: 13, color: "#444", marginTop: 2 }}>เลขที่ {ref}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>พิมพ์ {printedAt}</div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "2px solid #1a1a1a", margin: "0 0 16px" }} />

        {/* ── Recipient + Status ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              ผู้รับ / จัดส่งถึง
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>{b.recipient_name ?? "-"}</div>
            {b.phone ? (
              <div style={{ fontSize: 13, color: "#444", marginTop: 2 }}>โทร. {b.phone}</div>
            ) : null}
            {b.address_text ? (
              <div style={{ fontSize: 12.5, color: "#555", marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {b.address_text}
              </div>
            ) : null}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              สถานะ / ชำระ
            </div>
            <div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid #bbb",
                  color: "#333",
                  background: "#f5f5f5",
                }}
              >
                {meta.label}
              </span>
            </div>
            {b.payment_method ? (
              <div style={{ fontSize: 12.5, color: "#555", marginTop: 8 }}>
                <span style={{ color: "#888" }}>ช่องทางชำระ:</span>{" "}
                {PAYMENT_CHANNEL_LABEL[b.payment_method]}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "#888", marginTop: 8 }}>ช่องทางชำระ: -</div>
            )}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "0 0 14px" }} />

        {/* ── Items Table ── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          รายการเช่า
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12.5,
            marginBottom: 4,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1.5px solid #1a1a1a" }}>
              <th style={{ textAlign: "left", padding: "4px 6px 6px 0", color: "#888", fontWeight: 600, fontSize: 11.5, width: 24 }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 6px 6px 6px", color: "#888", fontWeight: 600, fontSize: 11.5 }}>รายการ</th>
              <th style={{ textAlign: "left", padding: "4px 6px 6px 6px", color: "#888", fontWeight: 600, fontSize: 11.5, width: 60 }}>ไซซ์</th>
              <th style={{ textAlign: "left", padding: "4px 6px 6px 6px", color: "#888", fontWeight: 600, fontSize: 11.5, width: 90 }}>รหัสสินค้า</th>
              <th style={{ textAlign: "left", padding: "4px 0 6px 6px", color: "#888", fontWeight: 600, fontSize: 11.5, width: 130 }}>วันเช่า</th>
            </tr>
          </thead>
          <tbody>
            {b.items.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "5px 6px 5px 0", color: "#aaa", verticalAlign: "top" }}>{idx + 1}</td>
                <td style={{ padding: "5px 6px", fontWeight: 500, color: "#1a1a1a", verticalAlign: "top" }}>
                  {item.product_name ?? b.dress_name ?? "สินค้า"}
                </td>
                <td style={{ padding: "5px 6px", color: "#444", verticalAlign: "top" }}>
                  {item.size ? sizeLabel(item.size) : "-"}
                </td>
                <td
                  style={{
                    padding: "5px 6px",
                    color: "#555",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 11.5,
                    verticalAlign: "top",
                  }}
                >
                  {item.unit_code ?? "-"}
                </td>
                <td style={{ padding: "5px 0 5px 6px", color: "#444", verticalAlign: "top" }}>
                  {fmtThai(b.start_date)} – {fmtThai(b.end_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "14px 0" }} />

        {/* ── Shipping + Summary ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Shipping */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              การจัดส่ง
            </div>
            <div style={{ fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: "#666" }}>ขาไป:</span>{" "}
              <span style={{ color: "#1a1a1a" }}>
                {shipPlan
                  ? (shipPlan.outbound.method === "express" ? "ส่งด่วน" : "ส่งพัสดุ")
                  : (b.outbound_method === "express" ? "ส่งด่วน" : "ส่งพัสดุ")}
              </span>
              <div style={{ fontSize: 11.5, color: "#777", marginTop: 2, lineHeight: 1.5 }}>{outboundWhen}</div>
            </div>
            <div style={{ fontSize: 12.5 }}>
              <span style={{ color: "#666" }}>ขากลับ:</span>{" "}
              <span style={{ color: "#1a1a1a" }}>
                {shipPlan
                  ? (shipPlan.return.method === "express" ? "ส่งด่วน" : "ส่งพัสดุ")
                  : (b.return_method === "express" ? "ส่งด่วน" : "ส่งพัสดุ")}
              </span>
              <div style={{ fontSize: 11.5, color: "#777", marginTop: 2, lineHeight: 1.5 }}>{returnWhen}</div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              สรุปยอด
            </div>
            <SummaryRow label="ค่าเช่า" value={`฿${rentalTotal.toLocaleString()}`} />
            <SummaryRow label="ค่ามัดจำ" value={`฿${depositTotal.toLocaleString()}`} />
            <SummaryRow
              label="ค่าจัดส่ง"
              value={shippingFee != null ? `฿${shippingFee.toLocaleString()}` : "รอร้านคำนวณ"}
              muted={shippingFee == null}
            />
            <div style={{ borderTop: "1.5px solid #1a1a1a", marginTop: 6, paddingTop: 6 }}>
              <SummaryRow label="ยอดรวม" value={`฿${grandTotal.toLocaleString()}`} bold />
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "20px 0 16px" }} />

        {/* ── Signature Footer ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 8 }}>
          <div>
            <div style={{ borderTop: "1px solid #999", paddingTop: 6, fontSize: 12, color: "#666" }}>
              ผู้จัดเตรียมชุด
            </div>
          </div>
          <div>
            <div style={{ borderTop: "1px solid #999", paddingTop: 6, fontSize: 12, color: "#666" }}>
              วันที่จัดส่ง
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryRow({
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
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12.5 }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span
        style={{
          fontWeight: bold ? 700 : 500,
          color: muted ? "#aaa" : "#1a1a1a",
          fontSize: bold ? 14 : 12.5,
        }}
      >
        {value}
      </span>
    </div>
  );
}
