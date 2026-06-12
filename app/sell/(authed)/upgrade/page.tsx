import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "อัปเกรดแพ็กเกจ",
  robots: { index: false, follow: false },
};

const PLAN_LABEL: Record<string, string> = {
  boost: "Boost · ฿990 / เดือน",
  featured: "Featured · ฿2,900 / เดือน",
};

export default function UpgradePage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = searchParams.plan ?? "";
  const label = PLAN_LABEL[plan];

  return (
    <div className="container" style={{ paddingTop: 80, paddingBottom: 100 }}>
      <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 22px",
            borderRadius: 999,
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
          }}
        >
          🛠️
        </div>
        <h1
          className="page-title"
          style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 14 }}
        >
          ระบบชำระเงินกำลังพัฒนา
        </h1>
        {label ? (
          <p style={{ fontSize: 14, color: "var(--accent-2)", fontWeight: 600, marginBottom: 10 }}>
            แพ็กเกจที่เลือก: {label}
          </p>
        ) : null}
        <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.65, marginBottom: 28 }}>
          เรากำลังต่อระบบจ่ายเงินผ่านบัตรเครดิต PromptPay และโอนบัญชีบริษัท
          เร็วๆ นี้คุณจะอัปเกรดแพ็กเกจได้เองในเว็บ ระหว่างนี้ทักทีมงานเพื่ออัปเกรดล่วงหน้าได้เลย
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {/* Visitors here already own a boutique (hit the dress-quota limit) —
              /sell/signup would just bounce them back. Send them to the dashboard. */}
          <Link href="/sell/dashboard" className="btn btn-dark" style={{ padding: "12px 22px" }}>
            กลับไปที่ร้านของฉัน
          </Link>
          <a
            href="https://line.me/R/ti/p/@doprent"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ padding: "12px 22px" }}
          >
            ทักทีมงานเรื่องอัปเกรด
          </a>
        </div>
        <div style={{ marginTop: 26 }}>
          <Link href="/sell" style={{ fontSize: 14, color: "var(--ink-3)" }}>
            ← กลับไปหน้าแพ็กเกจ
          </Link>
        </div>
      </div>
    </div>
  );
}
