import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listOccasions } from "@/lib/products";
import { normalizeTiers } from "@/lib/pricing";
import ProductForm from "../../ProductForm";
import type { Color, OccasionKey, PriceTier, Size } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แก้ไขสินค้า",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/products/${params.id}/edit`);

  const [shopRaw, productRaw, occasions] = await Promise.all([
    db.shop.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true, lineUrl: true, kycStatus: true },
    }),
    db.product.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, designer: true, size: true, color: true,
        pricePerDay: true, deposit: true, description: true, lineUrl: true,
        available: true, shopId: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        priceTiers: { orderBy: { minDays: "asc" }, select: { minDays: true, pricePerDay: true } },
        productTags: { select: { tag: { select: { key: true } } } },
      },
    }),
    listOccasions(),
  ]);

  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }
  if (!productRaw || productRaw.shopId !== shopRaw.id) notFound();

  // Derive max for each tier from next tier's minDays - 1 (last tier has max = null)
  const priceTiersRaw: PriceTier[] = productRaw.priceTiers.map((t, i, arr) => ({
    min: t.minDays,
    max: i < arr.length - 1 ? arr[i + 1].minDays - 1 : null,
    per_day: t.pricePerDay,
  }));
  const priceTiersNormalized: PriceTier[] = normalizeTiers(priceTiersRaw);
  const occasionKeys = productRaw.productTags.map((pt) => pt.tag.key as OccasionKey);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 720 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 24px" }}>
        แก้ไขสินค้า · {productRaw.name}
      </h1>
      <ProductForm
        mode="edit"
        productId={productRaw.id}
        shopId={shopRaw.id}
        defaultLineUrl={shopRaw.lineUrl}
        occasions={occasions}
        initial={{
          name: productRaw.name,
          designer: productRaw.designer,
          size: productRaw.size as Size,
          color: productRaw.color as Color,
          price_per_day: productRaw.pricePerDay,
          price_tiers: priceTiersNormalized,
          deposit: productRaw.deposit,
          description: productRaw.description,
          line_url: productRaw.lineUrl,
          images: productRaw.images.map((img) => img.url),
          occasions: occasionKeys,
          available: productRaw.available,
        }}
      />
    </div>
  );
}
