import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import VerifiedBadge from "@/components/VerifiedBadge";
import { DressArt } from "@/components/DressArt";
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

const STATUS_COLOR: Record<string, string> = {
  pending: "#D97706",
  live: "#15803D",
  rejected: "#DC2626",
  draft: "#6B7280",
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

  const sb = createClient();
  const { data: boutique } = await sb
    .from("boutiques")
    .select("*")
    .eq("owner_id", user.profile.id)
    .limit(1)
    .maybeSingle();
  if (!boutique) redirect("/sell/signup");
  // Signup flow not complete — KYC never submitted (or was rejected) → force user back
  if (boutique.kyc_status === "none" || boutique.kyc_status === "rejected") {
    redirect(`/sell/kyc?slug=${boutique.slug}`);
  }

  // Get dresses + click counts in parallel
  const [dressesRes, clicksRes] = await Promise.all([
    sb
      .from("dresses")
      .select("*")
      .eq("boutique_id", boutique.id)
      .order("created_at", { ascending: false }),
    sb
      .from("line_clicks")
      .select("id", { count: "exact", head: true })
      .eq("boutique_id", boutique.id),
  ]);

  const dresses = (dressesRes.data ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    designer: string | null;
    size: string;
    color: string;
    price_per_day: number;
    status: string;
    available: boolean;
    views: number;
    images: string[];
    created_at: string;
  }>;
  const totalClicks = clicksRes.count ?? 0;
  const liveCount = dresses.filter((d) => d.status === "live" && d.available).length;
  const pendingCount = dresses.filter((d) => d.status === "pending").length;

  const kyc = KYC_LABEL[boutique.kyc_status as keyof typeof KYC_LABEL] ?? KYC_LABEL.none;
  const justSubmitted = searchParams?.kyc === "submitted";
  // Can add dresses only after KYC has been submitted (submitted or verified).
  const canAddDress =
    boutique.kyc_status === "submitted" || boutique.kyc_status === "verified";
  const dressLimit = dressLimitFor(boutique.ads_tier as AdsTier);
  const atLimit = dressLimit != null && dresses.length >= dressLimit;
  const quotaText = dressLimit == null ? `${dresses.length} ตัว (ไม่จำกัด)` : `${dresses.length}/${dressLimit} ตัว`;

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 80 }}>
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
          {boutique.name}
          {boutique.verified ? <VerifiedBadge size="md" /> : null}
        </h1>
        <div style={{ fontSize: 14, color: "var(--ink-3)" }}>
          {boutique.area_label}
          {boutique.status === "pending" ? (
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
            border: "1px solid var(--info)",
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
        {boutique.kyc_status === "none" || boutique.kyc_status === "rejected" ? (
          <Link
            href={`/sell/kyc?slug=${boutique.slug}`}
            className="btn btn-dark"
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            ส่งเอกสาร KYC →
          </Link>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ gap: 14, marginBottom: 28 }}>
        <StatCard label="ชุดออนไลน์" value={liveCount} sub={`/ ${dresses.length} ชุดทั้งหมด`} />
        <StatCard label="รออนุมัติ" value={pendingCount} sub="ทีม DopRent กำลังตรวจ" />
        <StatCard label="LINE clicks ทั้งหมด" value={totalClicks} sub="ลูกค้าทักร้าน" />
      </div>

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
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>รายการชุดทั้งหมด</h2>
          <span style={{ fontSize: 12, color: atLimit ? "var(--warn)" : "var(--ink-3)", background: atLimit ? "var(--warn-soft)" : "var(--bg)", border: `1px solid ${atLimit ? "var(--warn)" : "var(--line)"}`, borderRadius: 999, padding: "3px 10px", fontWeight: 500 }}>
            {TIER_LABEL[boutique.ads_tier as AdsTier] ?? "Free"} · ลงชุด {quotaText}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/sell/edit" className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13 }}>
            แก้ไขข้อมูลร้าน
          </Link>
          {canAddDress && !atLimit ? (
            <Link
              href="/sell/dresses/new"
              className="btn btn-dark"
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              + เพิ่มชุดใหม่
            </Link>
          ) : canAddDress && atLimit ? (
            <Link
              href="/sell/upgrade"
              className="btn btn-dark"
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              ครบโควต้า {quotaText} · อัปเกรด →
            </Link>
          ) : (
            <span
              title="ต้องส่งเอกสาร KYC ก่อนจึงจะเพิ่มชุดได้"
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
              + เพิ่มชุด (ล็อก · ส่ง KYC ก่อน)
            </span>
          )}
        </div>
      </div>

      {!canAddDress ? (
        <div
          style={{
            padding: 14,
            background: "var(--warn-soft)",
            border: "1px solid var(--warn)",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13.5,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          ⚠️ ต้อง <Link href={`/sell/kyc?slug=${boutique.slug}`} style={{ color: "var(--warn)", fontWeight: 600 }}>ส่งเอกสาร KYC →</Link> ก่อนถึงจะเพิ่มชุดได้
        </div>
      ) : null}

      {/* Dress list */}
      {dresses.length === 0 ? (
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>ยังไม่มีชุดในร้าน</h3>
          <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 18 }}>
            เริ่มเพิ่มชุดแรก ลูกค้าจะเห็นทันทีหลังร้านได้รับอนุมัติ
          </p>
          <Link href="/sell/dresses/new" className="btn btn-dark">
            + เพิ่มชุดแรก
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
          {dresses.map((d, i) => {
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
                    <DressArt color={d.color as never} variant={i} />
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
                    {d.designer || "—"} · Size {d.size} · ฿{d.price_per_day.toLocaleString()}/วัน
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        background: `${STATUS_COLOR[d.status]}1A`,
                        color: STATUS_COLOR[d.status],
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
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <Link
                    href={`/sell/dresses/${d.id}/edit`}
                    className="btn btn-outline"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    แก้ไข
                  </Link>
                  <Link
                    href={`/sell/dresses/${d.id}/calendar`}
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
