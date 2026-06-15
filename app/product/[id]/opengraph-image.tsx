import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getProductBySlug } from "@/lib/products";

// nodejs runtime required: lib/products → lib/db uses Prisma + AsyncLocalStorage (not edge-compatible)
export const runtime = "nodejs";
export const alt = "DopRent · Bangkok boutique rental";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// next/og (satori) ships NO Thai glyphs — without these the Thai text (product
// name, ฿…/วัน, ไซส์, shop name) renders as tofu boxes. Load Thai + Latin subsets
// from public/fonts (copied into the standalone image) via fs.
async function loadFonts() {
  const dir = join(process.cwd(), "public", "fonts");
  const [thai, latin] = await Promise.all([
    readFile(join(dir, "NotoSansThai-thai-600.ttf")),
    readFile(join(dir, "NotoSansThai-latin-600.ttf")),
  ]);
  return [
    { name: "Noto", data: latin, weight: 400 as const, style: "normal" as const },
    { name: "Noto", data: latin, weight: 700 as const, style: "normal" as const },
    { name: "Noto", data: thai, weight: 400 as const, style: "normal" as const },
    { name: "Noto", data: thai, weight: 700 as const, style: "normal" as const },
  ];
}

export default async function OG({ params }: { params: { id: string } }) {
  const [dress, fonts] = await Promise.all([getProductBySlug(params.id), loadFonts()]);

  const title = dress?.name ?? "DopRent";
  const designer = dress?.designer ?? "Bangkok boutique rentals";
  // NB: use "บาท" not "฿" — the Noto Thai subset lacks the U+0E3F baht glyph (renders as tofu in the OG card).
  const price = dress ? `${dress.price_per_day.toLocaleString()} บาท / วัน` : "เช่าชุดดีไซเนอร์ในกรุงเทพฯ";
  const tag = dress ? `${dress.shop_name} · ไซส์ ${dress.size}` : "ติดต่อจองผ่าน LINE";
  // NB: product photos are stored as .webp, which satori (next/og) cannot decode,
  // so we render a clean branded text card instead of compositing the image.

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
          fontFamily: "Noto"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 14, height: 14, background: "#c98a8a", borderRadius: 999 }} />
          <div style={{ fontSize: 28, letterSpacing: 1, fontWeight: 700 }}>DopRent</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 32, color: "#1a1a1a99", marginBottom: 16 }}>{designer}</div>
          <div style={{ fontSize: 84, lineHeight: 1.05, fontWeight: 700, maxWidth: 1000 }}>
            {title}
          </div>
          <div style={{ fontSize: 36, marginTop: 28, color: "#1a1a1a" }}>{price}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#1a1a1a99", fontSize: 24 }}>
          <div>{tag}</div>
          <div>doprent.com</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
