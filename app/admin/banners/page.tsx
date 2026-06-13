import type { Metadata } from "next";
import { db } from "@/lib/db";
import BannerForm from "./BannerForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แบนเนอร์ · Admin",
  robots: { index: false, follow: false },
};

export default async function BannersAdminPage() {
  const banners = await db.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      imageUrl: true,
      linkUrl: true,
      sortOrder: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>แบนเนอร์</h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24 }}>
        จัดการแบนเนอร์สำหรับ carousel หน้าหลัก — เพิ่ม/แก้ไข/ลบ/สลับสถานะ
      </p>

      {/* Create new banner */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>เพิ่มแบนเนอร์ใหม่</h2>
        <BannerForm mode="create" />
      </section>

      {/* Banner list */}
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
          ยังไม่มีแบนเนอร์ — เพิ่มแบนเนอร์แรกด้านบน
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {banners.map((banner) => (
            <div
              key={banner.id}
              style={{
                background: "var(--surface)",
                border: `1px solid ${banner.isActive ? "var(--line)" : "var(--line)"}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 20px" }}>
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
                  onError={undefined}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{banner.title}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: banner.isActive ? "var(--accent-soft, #d1fae5)" : "var(--line)",
                        color: banner.isActive ? "var(--accent-dark, #065f46)" : "var(--ink-3)",
                        fontWeight: 600,
                      }}
                    >
                      {banner.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>ลำดับ: {banner.sortOrder}</span>
                  </div>
                  {banner.linkUrl && (
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      🔗 {banner.linkUrl}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    {banner.startsAt && <span>เริ่ม: {new Date(banner.startsAt).toLocaleDateString("th-TH")} </span>}
                    {banner.endsAt && <span>สิ้นสุด: {new Date(banner.endsAt).toLocaleDateString("th-TH")}</span>}
                    {!banner.startsAt && !banner.endsAt && <span>ไม่กำหนดช่วงเวลา</span>}
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
                <BannerForm
                  mode="edit"
                  banner={{
                    id: banner.id,
                    title: banner.title,
                    imageUrl: banner.imageUrl,
                    linkUrl: banner.linkUrl ?? "",
                    sortOrder: banner.sortOrder,
                    isActive: banner.isActive,
                    startsAt: banner.startsAt ? banner.startsAt.toISOString().slice(0, 16) : "",
                    endsAt: banner.endsAt ? banner.endsAt.toISOString().slice(0, 16) : "",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
