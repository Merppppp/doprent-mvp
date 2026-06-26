import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dressLimitFor, TIER_LABEL } from "@/lib/tiers";
import { type AdsTier } from "@/lib/types";
import { parseBusinessHours } from "@/lib/hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard ร้านของฉัน",
  robots: { index: false, follow: false },
};

/* ── Booking status mapping ── */
const STAGES = {
  booking_pending: { label: "รอยืนยัน", color: "var(--warn)", hint: "คำขอจองใหม่" },
  waiting_for_payment: { label: "รอจ่าย", color: "var(--warn)", hint: "รอลูกค้าโอน" },
  payment_review: { label: "ตรวจสลิป", color: "var(--cobalt)", hint: "ลูกค้าจ่ายแล้ว รอยืนยัน" },
  confirmed: { label: "ยืนยันแล้ว", color: "var(--success)", hint: "พร้อมจัดส่ง" },
  renting: { label: "กำลังเช่า", color: "var(--info, #3b82f6)", hint: "ลูกค้ากำลังเช่าอยู่" },
  awaiting_return: { label: "รอคืนของ", color: "var(--warn)", hint: "ครบกำหนดแล้ว รอรับชุดคืน" },
  returned: { label: "รอตรวจคืน", color: "var(--save, #d6492f)", hint: "ตรวจชุด + คืนมัดจำ" },
} as const;

const TODO_ORDER: (keyof typeof STAGES)[] = [
  "booking_pending",
  "payment_review",
  "awaiting_return",
  "returned",
  "waiting_for_payment",
  "confirmed",
  "renting",
];

const ALL_VISIBLE: (keyof typeof STAGES | "completed" | "cancelled")[] = [
  "booking_pending",
  "waiting_for_payment",
  "payment_review",
  "confirmed",
  "renting",
  "awaiting_return",
  "returned",
  "completed",
  "cancelled",
];

export default async function SellerDashboard({
  searchParams,
}: {
  searchParams: { kyc?: string };
}) {
  // Staff redirect — staff can't access owner dashboard
  const session = await auth();
  if (session?.user?.role === "staff") {
    if (session.user.canManageBookings) redirect("/sell/bookings");
    if (session.user.canManageProducts) redirect("/sell/products");
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "var(--ink-2)", fontSize: 14 }}>
        บัญชีพนักงานนี้ยังไม่ได้รับสิทธิ์จัดการ กรุณาติดต่อเจ้าของร้าน
      </div>
    );
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/dashboard");

  const shopRaw = await db.shop.findFirst({ where: { ownerId: user.id } });
  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }

  // ── Fetch all dashboard data in parallel ──
  const [productRows, totalClicks, bookingCounts, repeatCustomers] = await Promise.all([
    db.product.findMany({
      where: { shopId: shopRaw.id },
      select: { id: true, status: true, available: true },
    }),
    db.lineClick.count({ where: { shopId: shopRaw.id } }),
    // Count bookings per status
    db.booking.groupBy({
      by: ["status"],
      where: { shopId: shopRaw.id },
      _count: true,
    }),
    // Count repeat customers (rented >= 2 times)
    db.booking.groupBy({
      by: ["renterId"],
      where: {
        shopId: shopRaw.id,
        status: { in: ["confirmed", "returned", "completed"] },
      },
      having: { renterId: { _count: { gte: 2 } } },
    }),
  ]);

  // Build status → count map
  const statusMap: Record<string, number> = {};
  for (const row of bookingCounts) {
    statusMap[row.status] = row._count;
  }

  const liveCount = productRows.filter((p) => p.status === "live" && p.available).length;
  const productLimit = dressLimitFor(shopRaw.adsTier as AdsTier);
  const atLimit = productLimit != null && productRows.length >= productLimit;
  const canAddProduct = shopRaw.kycStatus === "submitted" || shopRaw.kycStatus === "verified";

  // Business hours not configured (null or legacy free-text) → renters can't
  // pick a pickup time slot at checkout. Nudge the seller to set it.
  const hoursUnset = parseBusinessHours(shopRaw.hours) === null;

  // KYC status
  const justSubmitted = searchParams?.kyc === "submitted";
  const kycLabel: Record<string, { text: string; color: string }> = {
    none: { text: "ยังไม่ส่ง KYC", color: "var(--warn)" },
    submitted: { text: "ส่ง KYC แล้ว · รอตรวจ", color: "var(--info)" },
    verified: { text: "✓ ผ่าน KYC", color: "var(--success)" },
    rejected: { text: "KYC ตีกลับ", color: "var(--danger)" },
  };
  const kyc = kycLabel[shopRaw.kycStatus] ?? kycLabel.none;

  // Display name
  const firstName = user.fullName?.split(" ")[0] || user.email.split("@")[0];

  // Todo counts (actionable items)
  const todoItems = TODO_ORDER.map((key) => ({
    key,
    ...STAGES[key],
    count: statusMap[key] || 0,
  })).filter((t) => t.count > 0);

  return (
    <>
      {/* ── KYC banner (if just submitted) ── */}
      {justSubmitted && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--info-soft)",
            border: "1px solid color-mix(in oklch, var(--info) 30%, transparent)",
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12.5,
          }}
        >
          ✓ ส่งเอกสาร KYC สำเร็จ ทีม DopRent จะตรวจและแจ้งผลภายใน 24-72 ชม.
        </div>
      )}

      {/* ── KYC pending banner ── */}
      {shopRaw.kycStatus === "submitted" && !justSubmitted && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--warn-soft)",
            border: "1px solid color-mix(in oklch, var(--warn) 30%, transparent)",
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12.5,
            color: "var(--ink-2)",
          }}
        >
          KYC อยู่ระหว่างตรวจสอบ สามารถเพิ่มสินค้าได้เลยระหว่างรอ
        </div>
      )}

      {/* ── Business-hours not set nudge (informational) ── */}
      {hoursUnset && (
        <Link
          href="/sell/edit#hours"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "11px 14px",
            background: "var(--info-soft)",
            border: "1px solid color-mix(in oklch, var(--info) 30%, transparent)",
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12.5,
            color: "var(--ink-2)",
            textDecoration: "none",
          }}
        >
          <span>
            ตั้ง <strong>เวลาทำการ</strong> ของร้าน เพื่อให้ลูกค้าเห็นเวลาเปิด–ปิด และเปิดรับส่งด่วนภายในวันได้
          </span>
          <span style={{ fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>
            ตั้งค่าเลย →
          </span>
        </Link>
      )}

      {/* ── Greeting ── */}
      <div className="seller-topbar">
        <div>
          <h1 className="seller-h1">
            สวัสดีค่ะ คุณ{firstName} 👋
          </h1>
          <p className="seller-sub">
            ภาพรวมร้านและสิ่งที่ต้องทำวันนี้
          </p>
        </div>
        {canAddProduct && !atLimit ? (
          <Link href="/sell/products/new" className="btn btn-dark" style={{ padding: "9px 15px", fontSize: 13, fontWeight: 600, borderRadius: 9 }}>
            + เพิ่มสินค้าใหม่
          </Link>
        ) : canAddProduct && atLimit ? (
          <Link href="/sell/upgrade" className="btn btn-dark" style={{ padding: "9px 15px", fontSize: 13, fontWeight: 600, borderRadius: 9 }}>
            ครบโควต้า · อัปเกรด →
          </Link>
        ) : null}
      </div>

      {/* ── KPI cards ── */}
      <div className="seller-kpis">
        <div className="seller-kpi">
          <div className="lbl">สินค้าออนไลน์</div>
          <div className="val">{liveCount}</div>
          <div className="dl">
            จาก {productRows.length} รายการทั้งหมด
          </div>
        </div>
        <div className="seller-kpi">
          <div className="lbl">ออเดอร์ที่กำลังดำเนินการ</div>
          <div className="val">
            {(statusMap["confirmed"] || 0) + (statusMap["returned"] || 0)}
          </div>
          <div className="dl">ยืนยันแล้ว + รอคืน</div>
        </div>
        <div className="seller-kpi">
          <div className="lbl">ลูกค้าที่กลับมาเช่าซ้ำ</div>
          <div className="val">{repeatCustomers.length}</div>
          <div className="dl">เช่า ≥ 2 ครั้ง</div>
        </div>
        <div className="seller-kpi">
          <div className="lbl">LINE clicks ทั้งหมด</div>
          <div className="val">{totalClicks}</div>
          <div className="dl">ลูกค้าทักร้าน</div>
        </div>
      </div>

      {/* ── Todo section (actionable items) ── */}
      {todoItems.length > 0 && (
        <>
          <h2 className="seller-h2">ต้องทำวันนี้</h2>
          <div className="seller-block-grid">
            {todoItems.map((item) => (
              <Link
                key={item.key}
                href={`/sell/bookings?status=${item.key}`}
                className={`seller-sblock is-alert`}
              >
                <span className="chev">›</span>
                <div className="row1">
                  <span className="dot" style={{ background: item.color }} />
                  <span className="lbl">{item.label}</span>
                </div>
                <div>
                  <span className="big">{item.count}</span>
                  <span className="unit">รายการ</span>
                </div>
                <span className="hint">{item.hint}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── All booking statuses ── */}
      <h2 className="seller-h2">ออเดอร์ทั้งหมดตามสถานะ</h2>
      <div className="seller-block-grid">
        {ALL_VISIBLE.map((key) => {
          const count = statusMap[key] || 0;
          const stage = key in STAGES
            ? STAGES[key as keyof typeof STAGES]
            : key === "completed"
              ? { label: "จบงาน", color: "var(--ink-3)", hint: count ? "แตะดูรายการ" : "ไม่มีตอนนี้" }
              : { label: "ยกเลิก", color: "var(--ink-3)", hint: count ? "แตะดูรายการ" : "ไม่มีตอนนี้" };
          return (
            <Link
              key={key}
              href={`/sell/bookings?status=${key}`}
              className={`seller-sblock${count === 0 ? " is-zero" : ""}`}
            >
              <span className="chev">›</span>
              <div className="row1">
                <span className="dot" style={{ background: stage.color }} />
                <span className="lbl">{stage.label}</span>
              </div>
              <div>
                <span className="big">{count}</span>
                <span className="unit">รายการ</span>
              </div>
              <span className="hint">{stage.hint ?? (count ? "แตะดูรายการ" : "ไม่มีตอนนี้")}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Quick links for product management ── */}
      <h2 className="seller-h2">จัดการสินค้า</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/sell/products"
          style={{
            width: 220,
            padding: "14px 16px",
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "0.18s",
          }}
          className="seller-sblock"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>สินค้าทั้งหมด</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {productRows.length} รายการ · {liveCount} ออนไลน์
              {productLimit != null ? ` · ${productRows.length}/${productLimit}` : ""}
            </div>
          </div>
        </Link>
      </div>

      {/* ── KYC status footer ── */}
      <div
        style={{
          marginTop: 28,
          padding: "13px 16px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          fontSize: 12,
          color: "var(--ink-2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>สถานะ KYC: </span>
          <span style={{ fontWeight: 600, color: kyc.color }}>{kyc.text}</span>
          <span style={{ marginLeft: 12, fontSize: 11, color: "var(--ink-3)" }}>
            แพลน: {TIER_LABEL[shopRaw.adsTier as AdsTier] ?? "Free"}
          </span>
        </div>
        {/* KYC "none"/"rejected" are already redirected above, but keep
            link for verified/submitted users who want to check docs */}
        <Link
          href="/sell/edit"
          style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
        >
          แก้ไขข้อมูลร้าน →
        </Link>
      </div>
    </>
  );
}
