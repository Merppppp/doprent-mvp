import { notFound } from "next/navigation";
import ProductForm from "@/app/sell/(authed)/products/ProductForm";
import { getProductBySlug, getShopBySlug } from "@/lib/products";
import { listTagGroups, listTagRequestsForShop } from "@/lib/tags";
import { getTagGroupsForProductType } from "@/lib/tag-groups";

type Params = { id: string };

const DEFAULT_LINE = process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent";

export default async function EditDressPage({ params }: { params: Params }) {
  const dress = await getProductBySlug(params.id);
  if (!dress) notFound();

  // TODO: getProductBySlug returns Product (product_type_key, not product_type_id UUID).
  // We use "" as fallback — getTagGroupsForProductType handles empty string gracefully.
  // Upgrade path: add product_type_id to the Product type and mapProduct when needed.
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
            price_tiers: dress.price_tiers ?? [],
            selectedByGroup: initialSelectedByGroup,
          }}
        />
      </div>
    </div>
  );
}
