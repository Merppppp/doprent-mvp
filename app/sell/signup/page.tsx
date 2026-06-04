import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "สมัครเปิดร้าน",
  robots: { index: false, follow: false },
};

export default async function SellSignupPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/signup");

  const [existing, areasRaw] = await Promise.all([
    db.boutique.findFirst({ where: { ownerId: user.id }, select: { slug: true } }),
    db.area.findMany({ orderBy: { th: "asc" }, select: { key: true, th: true } }),
  ]);
  if (existing) redirect("/sell/dashboard");

  const areas = areasRaw as Array<{ key: string; th: string }>;

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 680 }}>
      <h1
        className="page-title"
        style={{ fontSize: 30, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.01em" }}
      >
        เปิดร้านของคุณ
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 28 }}>
        ขั้นที่ 1/3 · กรอกข้อมูลร้าน (ขั้น 2: KYC, ขั้น 3: เพิ่มชุดแรก)
      </p>
      <SignupForm areas={areas} />
    </div>
  );
}
