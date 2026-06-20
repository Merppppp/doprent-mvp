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
        variants: {
          where: { available: true },
          orderBy: { size: "asc" },
          select: { id: true, size: true },
        },
      },
    }),
  ]);

  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }
  if (!productRaw || productRaw.shopId !== shopRaw.id) notFound();

  const allBlackouts = await listBlackouts(productRaw.id, "all");

  const variants = productRaw.variants.map((v) => ({
    id: v.id,
    label: v.size,
  }));

  // Separate product-wide vs variant-specific blackouts
  const productWideBlackouts = allBlackouts
    .filter((b) => b.variantId === null)
    .map((b) => b.date);

  const variantBlackouts: Record<string, string[]> = {};
  for (const v of variants) {
    variantBlackouts[v.id] = allBlackouts
      .filter((b) => b.variantId === v.id)
      .map((b) => b.date);
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 640 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 4px" }}>
        ปฏิทินวันว่าง · {productRaw.name}
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        กดที่วันที่ที่สินค้านี้ <b>ไม่ว่าง</b> เพื่อบล็อกไม่ให้ลูกค้าเลือกวันนั้น เลือกแท็บไซซ์เพื่อปิดเป็นรายไซซ์
      </p>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "var(--surface)" }}>
        <AvailabilityCalendar
          productId={productRaw.id}
          variants={variants}
          initialProductBlackouts={productWideBlackouts}
          initialVariantBlackouts={variantBlackouts}
        />
      </div>
      <div style={{ marginTop: 20, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
        <b>ทุกไซซ์</b> = ปิดทั้งสินค้า (ลูกค้าเลือกไซซ์ไหนก็จองวันนี้ไม่ได้)<br />
        <b>ไซซ์เฉพาะ</b> = ปิดเฉพาะไซซ์นั้น (ไซซ์อื่นยังจองได้)
      </div>
    </div>
  );
}
