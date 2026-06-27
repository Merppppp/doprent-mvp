import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTagGroups, listTagRequestsForShop } from "@/lib/tags";
import { getTagGroupsForProductType } from "@/lib/tag-groups";
import type { BoundTagGroup } from "@/lib/tag-groups";
import { parseBusinessHours } from "@/lib/hours";
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
    select: { id: true, slug: true, name: true, lineUrl: true, kycStatus: true, promptpayId: true, bankAccountNumber: true, hours: true },
  });
  if (!raw) redirect("/sell/signup");
  if (raw.kycStatus === "none" || raw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${raw.slug}`);
  }

  // Check payment channel (guard — also hard-blocked in createProduct action)
  const hasPaymentChannel = !!(raw.promptpayId || raw.bankAccountNumber);
  // Check business hours (guard — also hard-blocked in createProduct action)
  const hasHours = !!parseBusinessHours(raw.hours);

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
      {!hasPaymentChannel && (
        <div
          style={{
            padding: "16px 18px",
            background: "var(--warn-soft)",
            border: "1px solid var(--warn)",
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--warn-ink)", marginBottom: 6 }}>
            ⚠️ ยังไม่มีช่องทางรับชำระเงิน
          </div>
          <div style={{ fontSize: 13, color: "var(--warn-ink)", lineHeight: 1.6 }}>
            ต้องตั้งค่า PromptPay หรือบัญชีธนาคารก่อนจึงจะลงขายสินค้าได้
          </div>
          <a
            href="/sell/edit"
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid var(--warn)",
              borderRadius: 6,
              color: "var(--warn-ink)",
              background: "var(--warn-soft)",
              textDecoration: "none",
            }}
          >
            ไปตั้งค่าช่องทางรับเงิน →
          </a>
        </div>
      )}
      {!hasHours && (
        <div
          style={{
            padding: "16px 18px",
            background: "var(--warn-soft)",
            border: "1px solid var(--warn)",
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--warn-ink)", marginBottom: 6 }}>
            ⚠️ ยังไม่ได้ตั้งเวลาทำการของร้าน
          </div>
          <div style={{ fontSize: 13, color: "var(--warn-ink)", lineHeight: 1.6 }}>
            ต้องตั้งค่าเวลาทำการก่อนจึงจะลงขายสินค้าได้ (ใช้กำหนดปฏิทินจองและเวลาส่งด่วน)
          </div>
          <a
            href="/sell/edit"
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid var(--warn)",
              borderRadius: 6,
              color: "var(--warn-ink)",
              background: "var(--warn-soft)",
              textDecoration: "none",
            }}
          >
            ไปตั้งค่าเวลาทำการ →
          </a>
        </div>
      )}
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
