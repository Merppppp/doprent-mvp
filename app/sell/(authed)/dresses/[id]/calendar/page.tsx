import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listBlackouts } from "@/lib/products";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ปฏิทินวันว่าง",
  robots: { index: false, follow: false },
};

export default async function DressCalendarPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/dresses/${params.id}/calendar`);

  const [boutRaw, dressRaw] = await Promise.all([
    db.boutique.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true, kycStatus: true },
    }),
    db.dress.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, designer: true, boutiqueId: true, color: true, images: true },
    }),
  ]);

  if (!boutRaw) redirect("/sell/signup");
  if (boutRaw.kycStatus === "none" || boutRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${boutRaw.slug}`);
  }
  if (!dressRaw || dressRaw.boutiqueId !== boutRaw.id) notFound();

  const blackouts = await listBlackouts(dressRaw.id);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 640 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 4px" }}>
        ปฏิทินวันว่าง · {dressRaw.name}
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        กดที่วันที่ที่ชุดนี้ <b>ไม่ว่าง</b> (เช่น มีลูกค้าจองอยู่แล้ว) ระบบจะบล็อกไม่ให้ลูกค้าเลือกวันนั้น
      </p>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "var(--surface)" }}>
        <AvailabilityCalendar dressId={dressRaw.id} initialBlackouts={blackouts} />
      </div>
      <div style={{ marginTop: 20, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
        เคล็ดลับ: อัปเดตปฏิทินทุกครั้งหลังจบงานลูกค้า ลูกค้าใหม่จะเห็นวันที่จองชุดได้ทันที
      </div>
    </div>
  );
}
