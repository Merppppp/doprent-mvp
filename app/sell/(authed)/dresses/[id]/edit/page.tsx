import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listOccasions } from "@/lib/products";
import { normalizeTiers } from "@/lib/pricing";
import DressForm from "../../DressForm";
import type { Color, OccasionKey, PriceTier, Size } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แก้ไขชุด",
  robots: { index: false, follow: false },
};

export default async function EditDressPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/dresses/${params.id}/edit`);

  const [boutRaw, dressRaw, occasions] = await Promise.all([
    db.boutique.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true, lineUrl: true, kycStatus: true },
    }),
    db.dress.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, designer: true, size: true, color: true, pricePerDay: true, deposit: true, priceTiers: true, description: true, lineUrl: true, images: true, occasions: true, available: true, boutiqueId: true },
    }),
    listOccasions(),
  ]);

  if (!boutRaw) redirect("/sell/signup");
  if (boutRaw.kycStatus === "none" || boutRaw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${boutRaw.slug}`);
  }
  if (!dressRaw || dressRaw.boutiqueId !== boutRaw.id) notFound();

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 720 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 24px" }}>
        แก้ไขชุด · {dressRaw.name}
      </h1>
      <DressForm
        mode="edit"
        dressId={dressRaw.id}
        boutiqueId={boutRaw.id}
        defaultLineUrl={boutRaw.lineUrl}
        occasions={occasions}
        initial={{
          name: dressRaw.name,
          designer: dressRaw.designer,
          size: dressRaw.size as Size,
          color: dressRaw.color as Color,
          price_per_day: dressRaw.pricePerDay,
          price_tiers: normalizeTiers(dressRaw.priceTiers),
          deposit: dressRaw.deposit,
          description: dressRaw.description,
          line_url: dressRaw.lineUrl,
          images: (dressRaw.images ?? []) as string[],
          occasions: (dressRaw.occasions ?? []) as OccasionKey[],
          available: dressRaw.available,
        }}
      />
    </div>
  );
}
