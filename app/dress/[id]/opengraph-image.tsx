import { ImageResponse } from "next/og";
import { getDressBySlug } from "@/lib/dresses";

export const runtime = "edge";
export const alt = "DopRent — Bangkok boutique rental";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { id: string } }) {
  const dress = await getDressBySlug(params.id);

  // Fallback brand card when listing not found
  const title = dress?.name ?? "DopRent";
  const designer = dress?.designer ?? "Bangkok boutique rentals";
  const price = dress ? `฿${dress.price_per_day.toLocaleString()} / วัน` : "เช่าชุดดีไซเนอร์ในกรุงเทพฯ";
  const tag = dress ? `${dress.boutique_name} · ไซส์ ${dress.size}` : "ติดต่อจองผ่าน LINE";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #faf7f2 0%, #efe9df 100%)",
          color: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              background: "#c98a8a",
              borderRadius: 999
            }}
          />
          <div style={{ fontSize: 28, letterSpacing: 2, textTransform: "uppercase" }}>DopRent</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 32, color: "#1a1a1a99", marginBottom: 16 }}>{designer}</div>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              fontWeight: 600,
              maxWidth: 1000
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 36, marginTop: 28, color: "#1a1a1a" }}>{price}</div>
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
          <div>{tag}</div>
          <div>doprent.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
