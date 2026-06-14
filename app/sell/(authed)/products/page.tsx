import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductArt } from "@/components/ProductArt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "สินค้าในร้าน",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอตรวจ",
  live: "ออนไลน์",
  rejected: "ตีกลับ",
  draft: "ร่าง",
};

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  pending: { color: "var(--warn)", bg: "var(--warn-soft)" },
  live: { color: "var(--success)", bg: "var(--success-soft)" },
  rejected: { color: "var(--danger)", bg: "var(--danger-soft)" },
  draft: { color: "var(--ink-3)", bg: "var(--surface)" },
};

export default async function SellerProductsPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/products");

  const shop = await db.shop.findFirst({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!shop) redirect("/sell/signup");

  const productRows = await db.product.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      tagCode: true,
      name: true,
      designer: true,
      size: true,
      color: true,
      pricePerDay: true,
      status: true,
      rejectReason: true,
      available: true,
      views: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  return (
    <div style={{ paddingBottom: 60 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>สินค้าทั้งหมด ({productRows.length} รายการ)</h1>
        <Link href="/sell/products/new" className="btn btn-dark" style={{ padding: "8px 16px", fontSize: 13 }}>
          + เพิ่มสินค้าใหม่
        </Link>
      </div>

      {productRows.length === 0 ? (
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>ยังไม่มีสินค้าในร้าน</h3>
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
            เริ่มเพิ่มสินค้าแรก ลูกค้าจะเห็นทันทีหลังร้านได้รับอนุมัติ
          </p>
          <Link href="/sell/products/new" className="btn btn-dark">
            + เพิ่มสินค้าแรก
          </Link>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {productRows.map((d, i) => {
            const hasImg = d.images.length > 0;
            return (
              <div
                key={d.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "64px 1fr auto",
                  gap: 12,
                  padding: 12,
                  background: "var(--surface)",
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 80,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--bg)",
                  }}
                >
                  {hasImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.images[0].url}
                      alt={d.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <ProductArt color={d.color as never} variant={i} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                    {d.tagCode ? `รหัส: ${d.tagCode} · ` : ""}{d.designer || "—"} · Size {d.size} · ฿{d.pricePerDay.toLocaleString()}/วัน
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        background: STATUS_COLOR[d.status]?.bg ?? "var(--surface)",
                        color: STATUS_COLOR[d.status]?.color ?? "var(--ink-3)",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 3,
                      }}
                    >
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                    {!d.available ? (
                      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>· หยุดให้บริการ</span>
                    ) : null}
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>· {d.views} views</span>
                  </div>
                  {d.status === "rejected" && d.rejectReason ? (
                    <div
                      style={{
                        marginTop: 6,
                        padding: "6px 10px",
                        background: "var(--danger-soft)",
                        borderRadius: 6,
                        fontSize: 12.5,
                        color: "var(--danger)",
                        lineHeight: 1.5,
                      }}
                    >
                      เหตุผลที่ตีกลับ: {d.rejectReason}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <Link
                    href={`/sell/products/${d.id}/edit`}
                    className="btn btn-outline"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    แก้ไข
                  </Link>
                  <Link
                    href={`/sell/products/${d.id}/calendar`}
                    className="btn btn-outline"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    📅 ปฏิทิน
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
