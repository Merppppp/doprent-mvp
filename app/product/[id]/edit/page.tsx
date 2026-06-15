import { notFound } from "next/navigation";
import ProductForm from "@/app/sell/(authed)/products/ProductForm";
import { getProductBySlug, getShopBySlug } from "@/lib/products";
import { listTagGroups, listTagRequestsForShop } from "@/lib/tags";
import { getTagGroupsForProductType } from "@/lib/tag-groups";
import { db } from "@/lib/db";
import type { Size } from "@/lib/types";

type Params = { id: string };

const DEFAULT_LINE = process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent";

export default async function EditDressPage({ params }: { params: Params }) {
  const dress = await getProductBySlug(params.id);
  if (!dress) notFound();

  // TODO: getProductBySlug returns Product (product_type_key, not product_type_id UUID).
  // We use "" as fallback — getTagGroupsForProductType handles empty string gracefully.
  const productTypeId = "";

  const [tagGroupSections, tagGroups] = await Promise.all([
    getTagGroupsForProductType(productTypeId),
    listTagGroups(),
  ]);

  const boutique = await getShopBySlug((dress.shop_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  const tagRequestsRaw = await listTagRequestsForShop(dress.shop_id);
  const shopTagRequests = tagRequestsRaw.map((r) => ({
    id: r.id,
    requestedLabel: r.requestedLabel,
    requestedKey: r.requestedKey,
    status: r.status,
    reviewNotes: r.reviewNotes,
    tagGroup: r.tagGroup,
  }));

  // Build initialSelectedByGroup from dress.occasions (legacy) if no tag data available
  const initialSelectedByGroup: Record<string, string[]> =
    dress.occasions && dress.occasions.length > 0
      ? { occasion: dress.occasions }
      : {};

  // Load raw tiers + variants from DB
  const [rawTiers, rawVariants] = await Promise.all([
    db.productPriceTier.findMany({
      where: { productId: dress.id },
      orderBy: [{ minDays: "asc" }],
      select: { variantId: true, minDays: true, pricePerDay: true },
    }),
    db.productVariant.findMany({
      where: { productId: dress.id },
      orderBy: [{ size: "asc" }],
      select: { id: true, size: true, quantity: true, available: true, bustCm: true, waistCm: true, lengthCm: true },
    }),
  ]);

  // Determine price mode
  const hasPerVariantTiers = rawTiers.some((t) => t.variantId !== null);
  const priceMode: "shared" | "per_size" = hasPerVariantTiers ? "per_size" : "shared";

  // Build shared tiers
  const sharedTiers = rawTiers
    .filter((t) => t.variantId === null)
    .map((t) => ({ minDays: t.minDays, pricePerDay: t.pricePerDay }));

  // Build per-size tiers (group by variant)
  const perSizeTiers: { size: Size; tiers: { minDays: number; pricePerDay: number }[] }[] = [];
  if (hasPerVariantTiers) {
    for (const v of rawVariants) {
      const vTiers = rawTiers
        .filter((t) => t.variantId === v.id)
        .map((t) => ({ minDays: t.minDays, pricePerDay: t.pricePerDay }));
      if (vTiers.length > 0) {
        perSizeTiers.push({ size: v.size as Size, tiers: vTiers });
      }
    }
  }

  // Build variant rows (without pricePerDay/deposit)
  const initialVariants = rawVariants.map((v) => ({
    size: v.size as Size,
    quantity: v.quantity,
    available: v.available,
    bustCm: v.bustCm,
    waistCm: v.waistCm,
    lengthCm: v.lengthCm,
  }));

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 22, marginBottom: 18 }}>แก้ไขชุด</h1>
      <div style={{ maxWidth: 820 }}>
        <ProductForm
          mode="edit"
          productId={dress.id}
          shopId={dress.shop_id}
          defaultLineUrl={boutique?.line_url ?? DEFAULT_LINE}
          productTypeId={productTypeId}
          tagGroupSections={tagGroupSections}
          tagGroups={tagGroups}
          shopTagRequests={shopTagRequests}
          initial={{
            name: dress.name,
            designer: dress.designer,
            size: dress.size,
            color: dress.color,
            price_per_day: dress.price_per_day,
            deposit: dress.deposit,
            description: dress.description,
            line_url: dress.line_url ?? "",
            images: dress.images ?? [],
            available: !!dress.available,
            selectedByGroup: initialSelectedByGroup,
            // NEW price tier fields:
            price_mode: priceMode,
            shared_tiers: sharedTiers.length > 0 ? sharedTiers : [{ minDays: 1, pricePerDay: dress.price_per_day }],
            per_size_tiers: perSizeTiers,
            variants: initialVariants.length > 0 ? initialVariants : undefined,
          }}
        />
      </div>
    </div>
  );
}
