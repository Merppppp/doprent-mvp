import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeTiers } from "@/lib/pricing";
import { listTagGroups, listTagRequestsForShop } from "@/lib/tags";
import { getTagGroupsForProductType } from "@/lib/tag-groups";
import ProductForm from "../../ProductForm";
import type { PriceTier, Size } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แก้ไขสินค้า",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/products/${params.id}/edit`);

  const [shopRaw, productRaw] = await Promise.all([
    db.shop.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true, lineUrl: true, kycStatus: true },
    }),
    db.product.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, designer: true, size: true, color: true,
        pricePerDay: true, deposit: true, description: true, lineUrl: true,
        available: true, shopId: true, productTypeId: true,
        policyOverride: true,
        leadTimeDays: true, minRentalDays: true, maxRentalDays: true,
        returnWindowDays: true, bufferDaysAfter: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        priceTiers: { orderBy: { minDays: "asc" }, select: { minDays: true, pricePerDay: true } },
        productTags: {
          select: {
            tag: {
              select: {
                key: true,
                tagGroup: { select: { key: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }
  if (!productRaw || productRaw.shopId !== shopRaw.id) notFound();

  const priceTiersRaw: PriceTier[] = productRaw.priceTiers.map((t, i, arr) => ({
    min: t.minDays,
    max: i < arr.length - 1 ? arr[i + 1].minDays - 1 : null,
    per_day: t.pricePerDay,
  }));
  const priceTiersNormalized: PriceTier[] = normalizeTiers(priceTiersRaw);

  // Build initialSelectedByGroup from current productTags
  const initialSelectedByGroup: Record<string, string[]> = {};
  for (const pt of productRaw.productTags) {
    const groupKey = pt.tag.tagGroup.key;
    if (!initialSelectedByGroup[groupKey]) initialSelectedByGroup[groupKey] = [];
    initialSelectedByGroup[groupKey].push(pt.tag.key);
  }

  const [tagGroupSections, tagGroups, tagRequestsRaw] = await Promise.all([
    getTagGroupsForProductType(productRaw.productTypeId),
    listTagGroups(),
    listTagRequestsForShop(shopRaw.id),
  ]);

  const shopTagRequests = tagRequestsRaw.map((r) => ({
    id: r.id,
    requestedLabel: r.requestedLabel,
    requestedKey: r.requestedKey,
    status: r.status,
    reviewNotes: r.reviewNotes,
    tagGroup: r.tagGroup,
  }));

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
        productTypeId={productRaw.productTypeId}
        tagGroupSections={tagGroupSections}
        tagGroups={tagGroups}
        shopTagRequests={shopTagRequests}
        initial={{
          name: productRaw.name,
          designer: productRaw.designer,
          size: productRaw.size as Size,
          price_per_day: productRaw.pricePerDay,
          price_tiers: priceTiersNormalized,
          deposit: productRaw.deposit,
          description: productRaw.description,
          line_url: productRaw.lineUrl,
          images: productRaw.images.map((img) => img.url),
          available: productRaw.available,
          policy_override: productRaw.policyOverride,
          lead_time_days: productRaw.leadTimeDays,
          min_rental_days: productRaw.minRentalDays,
          max_rental_days: productRaw.maxRentalDays,
          return_window_days: productRaw.returnWindowDays,
          buffer_days_after: productRaw.bufferDaysAfter,
          selectedByGroup: initialSelectedByGroup,
        }}
      />
    </div>
  );
}
