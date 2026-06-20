import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireShopAccess } from "@/lib/shop-access";
import { SELL_PRODUCTS_PAGE_SIZE as PAGE_SIZE } from "@/lib/config";
import { ProductArt } from "@/components/ProductArt";
import { toggleProductAvailable } from "@/app/actions/seller";
import ToggleSwitch from "@/components/ToggleSwitch";
import { formatVariantSizes } from "@/lib/types";

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

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-3)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--line)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  verticalAlign: "middle",
  borderBottom: "1px solid var(--line)",
};

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string };
}) {
  const { shopId } = await requireShopAccess({ need: "products" });

  const search = (searchParams?.q ?? "").trim();
  const where: Record<string, any> = { shopId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tagCode: { contains: search, mode: "insensitive" } },
      { designer: { contains: search, mode: "insensitive" } },
    ];
  }

  const total = await db.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalPages) : 1;

  const productRows = await db.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
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
      variants: { select: { size: true, available: true } },
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
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>สินค้าทั้งหมด ({total} รายการ)</h1>
        <Link href="/sell/products/new" className="btn btn-dark" style={{ padding: "8px 16px", fontSize: 13 }}>
          + เพิ่มสินค้าใหม่
        </Link>
      </div>

      {/* Search */}
      <form method="GET" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="ค้นหาชื่อสินค้า, รหัส, แบรนด์…"
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              fontSize: 13,
              color: "var(--ink)",
            }}
          />
          <button
            type="submit"
            className="btn btn-outline"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            ค้นหา
          </button>
          {search && (
            <Link
              href="/sell/products"
              className="btn btn-outline"
              style={{ padding: "9px 14px", fontSize: 13, color: "var(--ink-3)" }}
            >
              ล้าง
            </Link>
          )}
        </div>
      </form>

      {total === 0 ? (
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
        <>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              overflowX: "auto",
              background: "var(--surface)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={thStyle}>สินค้า</th>
                  <th style={thStyle}>ไซซ์</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ราคา/วัน</th>
                  <th style={thStyle}>สถานะ</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ยอดวิว</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>เปิดให้เช่า</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((d, i) => {
                  const hasImg = d.images.length > 0;
                  return (
                    <tr key={d.id}>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                          <div
                            style={{
                              width: 44,
                              height: 56,
                              borderRadius: 5,
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
                                marginBottom: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 280,
                              }}
                            >
                              {d.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                              {d.tagCode ? `รหัส: ${d.tagCode} · ` : ""}{d.designer || "—"}
                            </div>
                            {d.status === "rejected" && d.rejectReason ? (
                              <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--danger)", lineHeight: 1.4, maxWidth: 280 }}>
                                เหตุผลที่ตีกลับ: {d.rejectReason}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{formatVariantSizes(d.variants, d.size)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                        ฿{d.pricePerDay.toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "2px 8px",
                            background: STATUS_COLOR[d.status]?.bg ?? "var(--surface)",
                            color: STATUS_COLOR[d.status]?.color ?? "var(--ink-3)",
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 3,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "var(--ink-3)" }}>{d.views}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <form action={toggleProductAvailable.bind(null, d.id)} style={{ display: "inline-flex" }}>
                          <ToggleSwitch checked={d.available} label="เปิดให้เช่า" />
                        </form>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <Link
                            href={`/sell/products/${d.id}/edit`}
                            className="btn btn-outline"
                            style={{ padding: "5px 10px", fontSize: 12 }}
                          >
                            แก้ไข
                          </Link>
                          <Link
                            href={`/sell/products/${d.id}/calendar`}
                            className="btn btn-outline"
                            style={{ padding: "5px 10px", fontSize: 12 }}
                          >
                            📅
                          </Link>
                          {d.status === "live" && d.available && (
                            <Link
                              href={`/sell/products/${d.id}/manual-booking`}
                              style={{
                                padding: "5px 10px",
                                fontSize: 12,
                                fontWeight: 600,
                                borderRadius: 6,
                                background: "var(--accent)",
                                color: "var(--accent-ink, #fff)",
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              จองหน้าร้าน
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                หน้า {page} จาก {totalPages}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {page > 1 ? (
                  <Link
                    href={`/sell/products?page=${page - 1}`}
                    className="btn btn-outline"
                    style={{ padding: "6px 14px", fontSize: 13 }}
                  >
                    ← ก่อนหน้า
                  </Link>
                ) : (
                  <span className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13, opacity: 0.4, pointerEvents: "none" }}>
                    ← ก่อนหน้า
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={`/sell/products?page=${page + 1}`}
                    className="btn btn-outline"
                    style={{ padding: "6px 14px", fontSize: 13 }}
                  >
                    ถัดไป →
                  </Link>
                ) : (
                  <span className="btn btn-outline" style={{ padding: "6px 14px", fontSize: 13, opacity: 0.4, pointerEvents: "none" }}>
                    ถัดไป →
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
