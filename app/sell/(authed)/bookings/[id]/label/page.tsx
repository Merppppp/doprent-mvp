import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getBookingForView, currentUserIsSellerOf } from "@/lib/booking-queries";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ใบที่อยู่จัดส่ง",
  robots: { index: false, follow: false },
};

function Fallback() {
  return (
    <div style={{ padding: 80, textAlign: "center", color: "#666" }}>
      ไม่พบการจองนี้
    </div>
  );
}

export default async function PrintLabelPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/sell/bookings/${params.id}/label`);

  const b = await getBookingForView(params.id);
  if (!b) return <Fallback />;

  const isSeller = await currentUserIsSellerOf(b.boutique_id);
  if (!isSeller) redirect(`/account/bookings/${b.id}`);

  const ref = `#${b.id.slice(0, 8).toUpperCase()}`;
  const isExpress = b.outbound_method === "express";

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
        title="ใบที่อยู่จัดส่ง"
      />

      <div
        id="print-root"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 60px)",
          padding: "32px 20px",
          background: "#f8f8f8",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 600,
            background: "#fff",
            color: "#1a1a1a",
            border: "2px solid #1a1a1a",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* ── Top dark header bar ── */}
          <div
            style={{
              background: "#1a1a1a",
              color: "#fff",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
              ใบจัดส่งพัสดุ
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.5)",
                color: "#fff",
              }}
            >
              {isExpress ? "ส่งด่วน" : "ส่งพัสดุ"}
            </span>
          </div>

          {/* ── Recipient / TO ── */}
          <div style={{ padding: "22px 24px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              ผู้รับ / TO
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.25, marginBottom: 8 }}>
              {b.recipient_name ?? "-"}
            </div>
            {b.phone ? (
              <div style={{ fontSize: 16, color: "#333", marginBottom: 6 }}>โทร. {b.phone}</div>
            ) : null}
            {b.address_text ? (
              <div
                style={{
                  fontSize: 16,
                  color: "#222",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {b.address_text}
              </div>
            ) : null}
          </div>

          <hr style={{ border: "none", borderTop: "1.5px solid #e0e0e0", margin: "0 24px" }} />

          {/* ── Sender / FROM + booking ref ── */}
          <div
            style={{
              padding: "16px 24px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                ผู้ส่ง / FROM
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>
                {b.boutique_name ?? "ร้านค้า"}
              </div>
              {b.boutique_line_url ? (
                <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                  LINE: {b.boutique_line_url}
                </div>
              ) : null}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                เลขที่จอง
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  fontFamily: "ui-monospace, monospace",
                  letterSpacing: "0.04em",
                }}
              >
                {ref}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
