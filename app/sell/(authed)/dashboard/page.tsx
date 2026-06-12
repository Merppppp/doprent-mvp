import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import VerifiedBadge from "@/components/VerifiedBadge";
import { ProductArt } from "@/components/ProductArt";
import SellerDashboardCalendarPanel from "@/components/SellerDashboardCalendarPanel";
import { dressLimitFor, TIER_LABEL } from "@/lib/tiers";
import type { AdsTier } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard ร้านของฉัน",
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

const KYC_LABEL: Record<string, { text: string; color: string }> = {
  none: { text: "ยังไม่ส่ง KYC", color: "var(--warn)" },
  submitted: { text: "ส่ง KYC แล้ว · รอตรวจ", color: "var(--info)" },
  verified: { text: "✓ ผ่าน KYC", color: "var(--success)" },
  rejected: { text: "KYC ตีกลับ · กรุณาส่งใหม่", color: "var(--danger)" },
};

export default async function SellerDashboard({
  searchParams,
}: {
  searchParams: { kyc?: string };
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/dashboard");

  const shopRaw = await db.shop.findFirst({ where: { ownerId: user.id } });
  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }

  const shop = {
    id: shopRaw.id, slug: shopRaw.slug, name: shopRaw.name,
    area_label: shopRaw.areaLabel, status: shopRaw.status,
    kyc_status: shopRaw.kycStatus, verified: shopRaw.verified,
  };

  const [productRows, totalClicks] = await Promise.all([
    db.product.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slug: true, tagCode: true, name: true, designer: true,
        size: true, color: true, pricePerDay: true, status: true, rejectReason: true,
        available: true, views: true, createdAt: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
    db.lineClick.count({ where: { shopId: shop.id } }),
  ]);

  const products = productRows.map((d) => ({
    id: d.id, slug: d.slug, tag_code: d.tagCode, name: d.name, designer: d.designer,
    size: d.size, color: d.color, price_per_day: d.pricePerDay, status: d.status,
    reject_reason: d.rejectReason,
    available: d.available, views: d.views,
    images: d.images.map((img) => img.url),
    created_at: d.createdAt.toISOString(),
  })) as Array<{
    id: string;
    slug: string;
    tag_code: string | null;
    name: string;
    designer: string | null;
    size: string;
    color: string;
    price_per_day: number;
    status: string;
    reject_reason: string | null;
    available: boolean;
    views: number;
    images: string[];
    created_at: string;
  }>;
  const liveCount = products.filter((d) => d.status === "live" && d.available).length;
  const pendingCount = products.filter((d) => d.status === "pending").length;

  const kyc = KYC_LABEL[shop.kyc_status as keyof typeof KYC_LABEL] ?? KYC_LABEL.none;
  const justSubmitted = searchParams?.kyc === "submitted";
  // Can add products only after KYC has been submitted (submitted or verified).
  const canAddProduct =
    shop.kyc_status === "submitted" || shop.kyc_status === "verified";
  const productLimit = dressLimitFor(shopRaw.adsTier as AdsTier);
  const atLimit = productLimit != null && products.length >= productLimit;
  const quotaText = productLimit == null ? `${products.length} รายการ (ไม่จำกัด)` : `${products.length}/${productLimit} รายการ`;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--ink-3)" }}>
          ← กลับหน้าแรก
        </Link>
        <h1
          className="page-title"
          style={{
            fontSize: 30,
            fontWeight: 600,
            marginTop: 10,
            marginBottom: 6,
            letterSpacing: "-0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {shop.name}
          {shop.verified ? <VerifiedBadge size="md" /> : null}
        </h1>
        <div style={{ fontSize: 14, color: "var(--ink-3)" }}>
          {shop.area_label}
          {shop.status === "pending" ? (
            <span
              style={{
                marginLeft: 8,
                padding: "2px 8px",
                background: "var(--warn-soft)",
                color: "var(--warn)",
                fontSize: 11,
                borderRadius: 3,
                fontWeight: 600,
              }}
            >
              ร้านรออนุมัติ
            </span>
          ) : null}
        </div>
      </div>

      {/* KYC banner */}
      {justSubmitted ? (
        <div
          style={{
            padding: 14,
            background: "var(--info-soft)",
            border: "1px solid color-mix(in oklch, var(--info) 30%, transparent)",
            borderRadius: 8,
            marginBottom: 18,
            fontSize: 14,
          }}
        >
          ✓ ส่งเอกสาร KYC สำเร็จ ทีม DopRent จะตรวจและแจ้งผลภายใน 24-72 ชม.
        </div>
      ) : null}
      <div
        style={{
          padding: 14,
          background: "var(--surface)",
          border: `1px solid var(--line)`,
          borderRadius: 8,
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>สถานะ KYC</div>
          <div style={{ fontWeight: 600, color: kyc.color, fontSize: 15 }}>{kyc.text}</div>
        </div>
        {(shop.kyc_status as string) === "none" || (shop.kyc_status as string) === "rejected" ? (
          <Link
            href={`/sell/kyc?slug=${shop.slug}`}
            className="btn btn-dark"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            ส่งเอกสาร KYC →
          </Link>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ gap: 14, marginBottom: 28 }}>
        <StatCard label="สินค้าออนไลน์" value={liveCount} sub={`/ ${products.length} รายการทั้งหมด`} />
        <StatCard label="รออนุมัติ" value={pendingCount} sub="ทีม DopRent กำลังตรวจ" />
        <StatCard label="LINE clicks ทั้งหมด" value={totalClicks} sub="ลูกค้าทักร้าน" />
      </div>

      {products.length > 0 ? (
        <SellerDashboardCalendarPanel
          dresses={products.map((d) => ({
            id: d.id,
            name: d.name,
            designer: d.designer,
            tag_code: d.tag_code ?? "",
            size: d.size,
            price_per_day: d.price_per_day,
          }))}
        />
      ) : null}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>รายการสินค้าทั้งหมด</h2>
          <span style={{ fontSize: 12, color: atLimit ? "var(--warn)" : "var(--ink-3)", background: atLimit ? "var(--warn-soft)" : "var(--bg)", border: `1px solid ${atLimit ? "var(--warn)" : "var(--line)"}`, borderRadius: 999, padding: "3px 10px", fontWeight: 500 }}>
            {TIER_LABEL[shopRaw.adsTier as AdsTier] ?? "Free"} · ลงสินค้า {quotaText}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/sell/edit" className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13 }}>
            แก้ไขข้อมูลร้าน
          </Link>
          {canAddProduct && !atLimit ? (
            <Link
              href="/sell/products/new"
              className="btn btn-dark"
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              + เพิ่มสินค้าใหม่
            </Link>
          ) : canAddProduct && atLimit ? (
            <Link
              href="/sell/upgrade"
              className="btn btn-dark"
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              ครบโควต้า {quotaText} · อัปเกรด →
            </Link>
          ) : (
            <span
              title="ต้องส่งเอกสาร KYC ก่อนจึงจะเพิ่มสินค้าได้"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                background: "var(--bg)",
                border: "1px dashed var(--line)",
                color: "var(--ink-3)",
                borderRadius: 6,
                cursor: "not-allowed",
              }}
            >
              + เพิ่มสินค้า (ล็อก · ส่ง KYC ก่อน)
            </span>
          )}
        </div>
      </div>

      {!canAddProduct ? (
        <div
          style={{
            padding: 14,
            background: "var(--warn-soft)",
            border: "1px solid color-mix(in oklch, var(--warn) 30%, transparent)",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13.5,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          ⚠️ ต้อง <Link href={`/sell/kyc?slug=${shop.slug}`} style={{ color: "var(--warn)", fontWeight: 600 }}>ส่งเอกสาร KYC →</Link> ก่อนถึงจะเพิ่มสินค้าได้
        </div>
      ) : null}

      {/* Product list */}
      {products.length === 0 ? (
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
          {products.map((d, i) => {
            const hasImg = Array.isArray(d.images) && d.images.length > 0;
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
                      src={d.images[0]}
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
                    {d.tag_code ? `รหัส: ${d.tag_code} · ` : ""}{d.designer || "—"} · Size {d.size} · ฿{d.price_per_day.toLocaleString()}/วัน
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
                      {STATUS_LABEL[d.status]}
                    </span>
                    {!d.available ? (
                      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>· หยุดให้บริการ</span>
                    ) : null}
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>· {d.views} views</span>
                  </div>
                  {d.status === "rejected" && d.reject_reason ? (
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
                      เหตุผลที่ตีกลับ: {d.reject_reason}
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

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div
      style={{
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
