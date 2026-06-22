import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SavedProductsGrid from "@/components/SavedProductsGrid";
import { getCurrentUser } from "@/lib/auth";
import { listProductsByIds } from "@/lib/products";

export const metadata: Metadata = { title: "สินค้าที่ถูกใจ", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account")}`);

  const saved = await listProductsByIds(user.savedProductIds);

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 16 }}>
        สินค้าที่ถูกใจ
      </h1>
      <SavedProductsGrid products={saved} savedIds={user.savedProductIds} />
    </>
  );
}
