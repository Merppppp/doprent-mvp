import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Overview",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [bPending, bLive, dPending, dLive, kycPending, clicks7d, totalClicks, bookingAttention] = await Promise.all([
    db.boutique.count({ where: { status: "pending" } }),
    db.boutique.count({ where: { status: "live" } }),
    db.dress.count({ where: { status: "pending" } }),
    db.dress.count({ where: { status: "live", available: true } }),
    db.kycSubmission.count({ where: { status: "pending" } }),
    db.lineClick.count({ where: { createdAt: { gte: since7d } } }),
    db.lineClick.count(),
    db.booking.count({ where: { status: { in: ["cancel_requested", "slip_disputed", "payment_review"] } } }),
  ]);

  return (
    <div>
      <h1
        className="page-title"
        style={{ fontSize: 26, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" }}
      >
        Admin Overview
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 28 }}>
        ภาพรวมและคิวงานที่รออนุมัติ
      </p>

      <div className="grid-4" style={{ gap: 14, marginBottom: 36 }}>
        <Stat label="KYC รออนุมัติ" value={kycPending} href="/admin/kyc" accent={!!kycPending} />
        <Stat label="ร้านรออนุมัติ" value={bPending} href="/admin/boutiques?status=pending" accent={!!bPending} />
        <Stat label="ชุดรออนุมัติ" value={dPending} href="/admin/dresses?status=pending" accent={!!dPending} />
        <Stat label="การจองรอแอดมิน" value={bookingAttention} href="/admin/bookings" accent={!!bookingAttention} />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>สถิติแพลตฟอร์ม</h2>
      <div className="grid-4" style={{ gap: 14 }}>
        <Stat label="ร้านออนไลน์" value={bLive} />
        <Stat label="ชุดออนไลน์" value={dLive} />
        <Stat label="LINE clicks 7 วัน" value={clicks7d} href="/admin/clicks" />
        <Stat label="LINE clicks ทั้งหมด" value={totalClicks} href="/admin/clicks" />
      </div>

      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>คำสั่งด่วน</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/admin/kyc" className="btn btn-outline" style={{ padding: "9px 14px", fontSize: 13 }}>
            ตรวจ KYC ({kycPending})
          </Link>
          <Link
            href="/admin/dresses?status=pending"
            className="btn btn-outline"
            style={{ padding: "9px 14px", fontSize: 13 }}
          >
            ตรวจชุดใหม่ ({dPending})
          </Link>
          <Link
            href="/admin/boutiques?status=pending"
            className="btn btn-outline"
            style={{ padding: "9px 14px", fontSize: 13 }}
          >
            ตรวจร้านใหม่ ({bPending})
          </Link>
          <Link
            href="/admin/bookings"
            className="btn btn-outline"
            style={{ padding: "9px 14px", fontSize: 13 }}
          >
            จัดการการจอง ({bookingAttention})
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href, accent }: { label: string; value: number; href?: string; accent?: boolean }) {
  const card = (
    <div
      style={{
        padding: 18,
        background: "var(--surface)",
        border: `1px solid ${accent && value > 0 ? "var(--info)" : "var(--line)"}`,
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: accent && value > 0 ? "var(--info)" : "var(--ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
