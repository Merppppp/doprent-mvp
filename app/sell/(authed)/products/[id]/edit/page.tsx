import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTagGroups, listTagRequestsForShop } from "@/lib/tags";
import { getTagGroupsForProductType } from "@/lib/tag-groups";
import ProductForm from "../../ProductForm";
import type { Size } from "@/lib/types";

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
        returnWindowDays: true, bufferDaysAfter: true, cleaningDays: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        priceTiers: { orderBy: { minDays: "asc" }, select: { variantId: true, minDays: true, pricePerDay: true } },
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
        variants: {
          orderBy: { size: "asc" },
          select: { id: true, size: true, quantity: true, available: true, bustCm: true, waistCm: true, lengthCm: true },
        },
      },
    }),
  ]);

  if (!shopRaw) redirect("/sell/signup");
  if (shopRaw.kycStatus === "none" || shopRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${shopRaw.slug}`);
  }
  if (!productRaw || productRaw.shopId !== shopRaw.id) notFound();

  // Determine price mode
  const hasPerVariantTiers = productRaw.priceTiers.some((t) => t.variantId !== null);
  const priceMode: "shared" | "per_size" = hasPerVariantTiers ? "per_size" : "shared";

  // Build shared tiers
  const sharedTiers = productRaw.priceTiers
    .filter((t) => t.variantId === null)
    .map((t) => ({ minDays: t.minDays, pricePerDay: t.pricePerDay }));

  // Build per-size tiers (group by variant id)
  const perSizeTiers: { size: Size; tiers: { minDays: number; pricePerDay: number }[] }[] = [];
  if (hasPerVariantTiers) {
    for (const v of productRaw.variants) {
      const vTiers = productRaw.priceTiers
        .filter((t) => t.variantId === v.id)
        .map((t) => ({ minDays: t.minDays, pricePerDay: t.pricePerDay }));
      if (vTiers.length > 0) {
        perSizeTiers.push({ size: v.size as Size, tiers: vTiers });
      }
    }
  }

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
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 12px" }}>
        แก้ไขสินค้า · {productRaw.name}
      </h1>
      <Link
        href={`/sell/products/${productRaw.id}/units`}
        className="mb-6 inline-block text-sm font-medium text-accent"
      >
        จัดการสต็อกรายตัว (ติดซ่อม / ปลดระวาง) →
      </Link>
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
          // NEW price tier fields:
          price_mode: priceMode,
          shared_tiers: sharedTiers.length > 0 ? sharedTiers : [{ minDays: 1, pricePerDay: productRaw.pricePerDay }],
          per_size_tiers: perSizeTiers,
          variants: productRaw.variants.map((v) => ({
            size: v.size as Size,
            quantity: v.quantity,
            available: v.available,
            bustCm: v.bustCm,
            waistCm: v.waistCm,
            lengthCm: v.lengthCm,
          })),
        }}
      />
    </div>
  );
}
