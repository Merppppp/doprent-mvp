import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin Overview",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const sb = createClient();
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [bPending, bLive, dPending, dLive, kycPending, clicks7d, totalClicks] = await Promise.all([
    sb.from("boutiques").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("boutiques").select("id", { count: "exact", head: true }).eq("status", "live"),
    sb.from("dresses").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("dresses").select("id", { count: "exact", head: true }).eq("status", "live").eq("available", true),
    sb.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("line_clicks").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    sb.from("line_clicks").select("id", { count: "exact", head: true }),
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

      <div className="grid-3" style={{ gap: 14, marginBottom: 36 }}>
        <Stat label="KYC รออนุมัติ" value={kycPending.count ?? 0} href="/admin/kyc" accent={!!kycPending.count} />
        <Stat label="ร้านรออนุมัติ" value={bPending.count ?? 0} href="/admin/boutiques?status=pending" accent={!!bPending.count} />
        <Stat label="ชุดรออนุมัติ" value={dPending.count ?? 0} href="/admin/dresses?status=pending" accent={!!dPending.count} />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>สถิติแพลตฟอร์ม</h2>
      <div className="grid-4" style={{ gap: 14 }}>
        <Stat label="ร้านออนไลน์" value={bLive.count ?? 0} />
        <Stat label="ชุดออนไลน์" value={dLive.count ?? 0} />
        <Stat label="LINE clicks 7 วัน" value={clicks7d.count ?? 0} href="/admin/clicks" />
        <Stat label="LINE clicks ทั้งหมด" value={totalClicks.count ?? 0} href="/admin/clicks" />
      </div>

      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>คำสั่งด่วน</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/admin/kyc" className="btn btn-outline" style={{ padding: "9px 14px", fontSize: 13 }}>
            ตรวจ KYC ({kycPending.count ?? 0})
          </Link>
          <Link
            href="/admin/dresses?status=pending"
            className="btn btn-outline"
            style={{ padding: "9px 14px", fontSize: 13 }}
          >
            ตรวจชุดใหม่ ({dPending.count ?? 0})
          </Link>
          <Link
            href="/admin/boutiques?status=pending"
            className="btn btn-outline"
            style={{ padding: "9px 14px", fontSize: 13 }}
          >
            ตรวจร้านใหม่ ({bPending.count ?? 0})
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
