import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTagGroups, listTagRequestsForShop } from "@/lib/tags";
import { getTagGroupsForProductType } from "@/lib/tag-groups";
import type { BoundTagGroup } from "@/lib/tag-groups";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เพิ่มสินค้าใหม่",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/products/new");

  const raw = await db.shop.findFirst({
    where: { ownerId: user.id },
    select: { id: true, slug: true, name: true, lineUrl: true, kycStatus: true },
  });
  if (!raw) redirect("/sell/signup");
  if (raw.kycStatus === "none" || raw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${raw.slug}`);
  }

  // Fetch all active product types + tag-group sections for each
  const [productTypesRaw, tagGroups, tagRequestsRaw] = await Promise.all([
    db.productType.findMany({
      where: { isActive: true },
      orderBy: { label: "asc" },
      select: { id: true, key: true, label: true },
    }),
    listTagGroups(),
    listTagRequestsForShop(raw.id),
  ]);

  // Build tagGroupSectionsByType map: productTypeId → BoundTagGroup[]
  const tagGroupSectionsByType: Record<string, BoundTagGroup[]> = {};
  await Promise.all(
    productTypesRaw.map(async (pt) => {
      tagGroupSectionsByType[pt.id] = await getTagGroupsForProductType(pt.id);
    }),
  );

  // Default to dress type; fall back to first type if dress is missing
  const dressType = productTypesRaw.find((pt) => pt.key === "dress");
  const defaultProductTypeId = dressType?.id ?? productTypesRaw[0]?.id ?? "";
  const defaultTagGroupSections = tagGroupSectionsByType[defaultProductTypeId] ?? [];

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
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 6px" }}>เพิ่มสินค้าใหม่</h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        สินค้าจะเป็นสถานะ &ldquo;รอตรวจ&rdquo; จนกว่า admin จะอนุมัติ (ปกติ &lt; 24 ชม.)
      </p>
      <ProductForm
        mode="create"
        shopId={raw.id}
        defaultLineUrl={raw.lineUrl}
        productTypeId={defaultProductTypeId}
        tagGroupSections={defaultTagGroupSections}
        tagGroups={tagGroups}
        shopTagRequests={shopTagRequests}
        productTypes={productTypesRaw}
        tagGroupSectionsByType={tagGroupSectionsByType}
      />
    </div>
  );
}
