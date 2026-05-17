import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DopRent · เช่าชุดดีไซเนอร์ในกรุงเทพฯ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #faf7f2 0%, #efe9df 60%, #e6dccd 100%)",
          color: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 14, height: 14, background: "#c98a8a", borderRadius: 999 }} />
          <div style={{ fontSize: 28, letterSpacing: 1, fontWeight: 600 }}>DopRent</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              fontWeight: 600,
              maxWidth: 1000
            }}
          >
            เช่าชุดดีไซเนอร์
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              fontWeight: 600,
              maxWidth: 1000
            }}
          >
            จากบูทีคในกรุงเทพฯ
          </div>
          <div style={{ fontSize: 36, marginTop: 28, color: "#1a1a1a99" }}>
            ติดต่อจองผ่าน LINE โดยตรงกับร้าน
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#1a1a1a99",
            fontSize: 24
          }}
        >
          <div>Bangkok · Boutique rentals</div>
          <div>doprent.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
