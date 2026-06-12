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

export default async function ProductCalendarPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/products/${params.id}/calendar`);

  const [shopRaw, productRaw] = await Promise.all([
    db.shop.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true, kycStatus: true },
    }),
    db.product.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, shopId: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
  ]);

  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }
  if (!productRaw || productRaw.shopId !== shopRaw.id) notFound();

  const blackouts = await listBlackouts(productRaw.id);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 640 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 4px" }}>
        ปฏิทินวันว่าง · {productRaw.name}
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        กดที่วันที่ที่สินค้านี้ <b>ไม่ว่าง</b> (เช่น มีลูกค้าจองอยู่แล้ว) ระบบจะบล็อกไม่ให้ลูกค้าเลือกวันนั้น
      </p>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "var(--surface)" }}>
        <AvailabilityCalendar productId={productRaw.id} initialBlackouts={blackouts} />
      </div>
      <div style={{ marginTop: 20, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
        เคล็ดลับ: อัปเดตปฏิทินทุกครั้งหลังจบงานลูกค้า ลูกค้าใหม่จะเห็นวันที่จองสินค้าได้ทันที
      </div>
    </div>
  );
}
