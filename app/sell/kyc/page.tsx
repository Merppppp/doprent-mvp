import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import KycWizard from "./KycWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ยืนยันตัวตน",
  robots: { index: false, follow: false },
};

export default async function KycPage({ searchParams }: { searchParams: { slug?: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/kyc");

  const where = searchParams?.slug
    ? { ownerId: user.id, slug: searchParams.slug }
    : { ownerId: user.id };

  const raw = await db.boutique.findFirst({
    where,
    select: { id: true, slug: true, name: true, kycStatus: true, status: true },
  });
  if (!raw) redirect("/sell/signup");

  const boutique = { id: raw.id, slug: raw.slug, name: raw.name, kyc_status: raw.kycStatus, status: raw.status };

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 760 }}>
      <h1 className="page-title" style={{ fontSize: 30, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.01em" }}>
        ยืนยันตัวตน · {boutique.name}
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 14 }}>
        ขั้นที่ 2/3 · ส่งเอกสารยืนยันตัวตน ทีม DopRent ตรวจภายใน 24-72 ชม.
      </p>
      <p style={{ fontSize: 13, marginBottom: 28 }}>
        ใส่ข้อมูลร้านผิด?{" "}
        <a href="/sell/edit" style={{ color: "var(--info)", fontWeight: 500 }}>แก้ข้อมูลร้านก่อน →</a>
      </p>

      {boutique.kyc_status === "submitted" || boutique.kyc_status === "verified" ? (
        <div style={{ padding: 18, border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {boutique.kyc_status === "verified" ? "✓ KYC ผ่านแล้ว" : "⏳ ส่งเอกสารแล้ว · รอตรวจ"}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            {boutique.kyc_status === "verified"
              ? "ร้านได้ verified badge แล้ว ไปต่อที่ Dashboard ได้เลย"
              : "ทีม DopRent จะแจ้งผลทาง LINE/email ภายใน 72 ชม."}
          </div>
          <a href="/sell/dashboard" className="btn btn-outline" style={{ marginTop: 12, display: "inline-block" }}>
            ไปที่ Dashboard →
          </a>
        </div>
      ) : (
        <KycWizard boutiqueId={boutique.id} />
      )}
    </div>
  );
}
