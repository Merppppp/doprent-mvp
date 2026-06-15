import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ShopBannerForm from "./ShopBannerForm";
import { BANNER_ELIGIBLE_TIERS } from "@/lib/banner-tiers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แบนเนอร์ร้าน · Seller",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  pending:  { text: "รออนุมัติ",  color: "var(--warn)",    bg: "var(--warn-soft)" },
  approved: { text: "อนุมัติแล้ว", color: "var(--success)", bg: "var(--success-soft, #d1fae5)" },
  rejected: { text: "ปฏิเสธ",    color: "var(--danger)",  bg: "var(--danger-soft)" },
};

export default async function SellerBannersPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/banners");

  const shop = await db.shop.findFirst({
    where: { ownerId: user.id },
    select: { id: true, slug: true, adsTier: true, name: true },
  });
  if (!shop) redirect("/sell/signup");

  const isEligible = (BANNER_ELIGIBLE_TIERS as readonly string[]).includes(shop.adsTier);

  const banners = isEligible
    ? await db.banner.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          linkUrl: true,
          isActive: true,
          status: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
        },
      })
    : [];

  const defaultLinkUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/shop/${shop.slug}`;

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        แบนเนอร์ร้าน
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24 }}>
        สร้างแบนเนอร์โปรโมชั่นสำหรับร้านของคุณ — แบนเนอร์จะแสดงบน carousel
        หน้าหลักหลังจากทีม DopRent อนุมัติ
      </p>

      {/* Upsell gate for free tier */}
      {!isEligible && (
        <div
          style={{
            padding: "28px 24px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            อัปเกรดแพ็กเกจโฆษณาเพื่อสร้างแบนเนอร์ร้าน
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-3)",
              marginBottom: 20,
              maxWidth: 420,
              margin: "0 auto 20px",
            }}
          >
            แบนเนอร์โปรโมชั่นพร้อมใช้งานสำหรับแพ็กเกจ Boost ขึ้นไป
            อัปเกรดเพื่อให้ร้านของคุณโดดเด่นบน carousel หน้าหลัก
          </p>
          <Link
            href="/sell/upgrade"
            className="btn btn-dark"
            style={{ padding: "10px 24px", fontSize: 14 }}
          >
            ดูแพ็กเกจและอัปเกรด →
          </Link>
        </div>
      )}

      {/* Create form — eligible tier only */}
      {isEligible && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 32,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            สร้างแบนเนอร์ใหม่
          </h2>
          <ShopBannerForm mode="create" defaultLinkUrl={defaultLinkUrl} />
        </section>
      )}

      {/* Banner list */}
      {isEligible && (
        <>
          {banners.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                color: "var(--ink-3)",
              }}
            >
              ยังไม่มีแบนเนอร์ร้าน — สร้างแบนเนอร์แรกด้านบน
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {banners.map((banner) => {
                const statusMeta =
                  STATUS_LABEL[banner.status] ?? STATUS_LABEL.pending;
                return (
                  <div
                    key={banner.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                        padding: "16px 20px",
                      }}
                    >
                      {/* Preview image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        style={{
                          width: 120,
                          height: 68,
                          objectFit: "cover",
                          borderRadius: 6,
                          flexShrink: 0,
                          background: "var(--line)",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 15 }}>
                            {banner.title}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: statusMeta.bg,
                              color: statusMeta.color,
                              fontWeight: 600,
                            }}
                          >
                            {statusMeta.text}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: banner.isActive
                                ? "var(--success-soft, #d1fae5)"
                                : "var(--line)",
                              color: banner.isActive
                                ? "var(--success, #065f46)"
                                : "var(--ink-3)",
                              fontWeight: 500,
                            }}
                          >
                            {banner.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </span>
                        </div>
                        {banner.linkUrl && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--ink-3)",
                              marginBottom: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🔗 {banner.linkUrl}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          {banner.startsAt && (
                            <span>
                              เริ่ม:{" "}
                              {new Date(banner.startsAt).toLocaleDateString(
                                "th-TH"
                              )}{" "}
                            </span>
                          )}
                          {banner.endsAt && (
                            <span>
                              สิ้นสุด:{" "}
                              {new Date(banner.endsAt).toLocaleDateString(
                                "th-TH"
                              )}
                            </span>
                          )}
                          {!banner.startsAt && !banner.endsAt && (
                            <span>ไม่กำหนดช่วงเวลา</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid var(--line)",
                        padding: "12px 20px",
                        background: "var(--bg)",
                      }}
                    >
                      <ShopBannerForm
                        mode="edit"
                        banner={{
                          id: banner.id,
                          title: banner.title,
                          imageUrl: banner.imageUrl,
                          linkUrl: banner.linkUrl ?? "",
                          isActive: banner.isActive,
                          status: banner.status,
                          startsAt: banner.startsAt
                            ? banner.startsAt.toISOString().slice(0, 16)
                            : "",
                          endsAt: banner.endsAt
                            ? banner.endsAt.toISOString().slice(0, 16)
                            : "",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
