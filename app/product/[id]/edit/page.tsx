import { notFound } from "next/navigation";
import ProductForm from "@/app/sell/(authed)/products/ProductForm";
import { getProductBySlug, listOccasions, getShopBySlug } from "@/lib/products";

type Params = { id: string };

const DEFAULT_LINE = process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent";

export default async function EditDressPage({ params }: { params: Params }) {
  const dress = await getProductBySlug(params.id);
  if (!dress) notFound();

  const occasions = await listOccasions();
  // ensure boutique exists (used for shop_id validity and line fallback)
  const boutique = await getShopBySlug((dress.shop_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"));

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 22, marginBottom: 18 }}>แก้ไขชุด</h1>
      <div style={{ maxWidth: 820 }}>
        <ProductForm
          mode="edit"
          productId={dress.id}
          shopId={dress.shop_id}
          defaultLineUrl={boutique?.line_url ?? DEFAULT_LINE}
          occasions={occasions}
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
            occasions: dress.occasions ?? [],
            available: !!dress.available,
            price_tiers: dress.price_tiers ?? [],
          }}
        />

      </div>
    </div>
  );
}
