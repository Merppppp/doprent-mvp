import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requireShopAccess } from "@/lib/shop-access";
import { db } from "@/lib/db";
import { loadProductUnits } from "@/lib/product-units";
import ProductUnitsManager from "@/components/ProductUnitsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "จัดการสต็อกรายตัว",
  robots: { index: false, follow: false },
};

export default async function ProductUnitsPage({ params }: { params: { id: string } }) {
  const access = await requireShopAccess({ need: "products" }).catch(() => null);
  if (!access) redirect(`/login?next=/sell/products/${params.id}/units`);

  const product = await db.product.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, shopId: true },
  });
  if (!product || product.shopId !== access.shopId) notFound();

  const variants = await loadProductUnits(product.id);

  return (
    <div className="container max-w-[720px] pt-8 pb-20">
      <Link href={`/sell/products/${product.id}/edit`} className="text-sm text-ink-3">
        ← แก้ไขสินค้า
      </Link>
      <h1 className="page-title mt-3 mb-2 text-[28px] font-semibold">
        จัดการสต็อกรายตัว · {product.name}
      </h1>
      <p className="mb-6 text-sm text-ink-2">
        แต่ละไซซ์มีหน่วยทางกายภาพรายตัว ทำเครื่องหมายตัวที่ติดซ่อมหรือปลดระวางได้
        — หน่วยที่ติดซ่อม/ปลดระวางจะไม่ถูกนับเป็นสต็อกที่เช่าได้
      </p>
      <ProductUnitsManager variants={variants} />
    </div>
  );
}
