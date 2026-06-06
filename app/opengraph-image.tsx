import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "doprent · เช่าชุดดีไซเนอร์ในกรุงเทพฯ";
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
          <img width={46} height={46} src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48ZyB0cmFuc2Zvcm09J3JvdGF0ZSgtNTIgNTAgNTApJz48Y2lyY2xlIGN4PSc1MCcgY3k9JzUwJyByPSczMicgZmlsbD0nbm9uZScgc3Ryb2tlPScjMUExNDEwJyBzdHJva2Utd2lkdGg9JzEyJyBzdHJva2UtbGluZWNhcD0ncm91bmQnIHN0cm9rZS1kYXNoYXJyYXk9JzE3MyAyOCcvPjxjaXJjbGUgY3g9JzgyJyBjeT0nNTAnIHI9JzknIGZpbGw9JyNGRjUyMzInLz48L2c+PC9zdmc+" />
          <div style={{ fontSize: 32, letterSpacing: -1, fontWeight: 700 }}>doprent</div>
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
