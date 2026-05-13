import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listOccasions } from "@/lib/dresses";
import DressForm from "../../DressForm";
import type { Color, OccasionKey, Size } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แก้ไขชุด — DopRent",
  robots: { index: false, follow: false },
};

export default async function EditDressPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/dresses/${params.id}/edit`);

  const sb = createClient();
  const { data: boutique } = await sb
    .from("boutiques")
    .select("id, line_url")
    .eq("owner_id", user.profile.id)
    .limit(1)
    .maybeSingle();
  if (!boutique) redirect("/sell/signup");

  const { data: dress } = await sb
    .from("dresses")
    .select("id, name, designer, size, color, price_per_day, deposit, description, line_url, images, occasions, available, boutique_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!dress || dress.boutique_id !== boutique.id) notFound();

  const occasions = await listOccasions();

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 720 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        ← กลับ Dashboard
      </Link>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 24px" }}>
        แก้ไขชุด — {dress.name}
      </h1>
      <DressForm
        mode="edit"
        dressId={dress.id}
        boutiqueId={boutique.id}
        defaultLineUrl={boutique.line_url}
        occasions={occasions}
        initial={{
          name: dress.name,
          designer: dress.designer,
          size: dress.size as Size,
          color: dress.color as Color,
          price_per_day: dress.price_per_day,
          deposit: dress.deposit,
          description: dress.description,
          line_url: dress.line_url,
          images: (dress.images ?? []) as string[],
          occasions: (dress.occasions ?? []) as OccasionKey[],
          available: dress.available,
        }}
      />
    </div>
  );
}
