import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EditBoutiqueForm from "./EditBoutiqueForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แก้ไขข้อมูลร้าน",
  robots: { index: false, follow: false },
};

export default async function EditBoutiquePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/edit");

  const sb = createClient();
  const { data: boutique } = await sb
    .from("boutiques")
    .select("*")
    .eq("owner_id", user.profile.id)
    .limit(1)
    .maybeSingle();
  if (!boutique) redirect("/sell/signup");

  const { data: areasData } = await sb
    .from("areas")
    .select("key, th")
    .order("th", { ascending: true });
  const areas = (areasData ?? []) as Array<{ key: string; th: string }>;

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 680 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        ← กลับ Dashboard
      </Link>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 24px" }}>
        แก้ไขข้อมูลร้าน
      </h1>
      <EditBoutiqueForm
        areas={areas}
        boutique={{
          id: boutique.id,
          name: boutique.name,
          area_key: boutique.area_key,
          area_label: boutique.area_label,
          line_url: boutique.line_url,
          instagram: boutique.instagram,
          promptpay_id: boutique.promptpay_id ?? null,
          since_year: boutique.since_year,
          tag: boutique.tag,
          story: boutique.story,
          owner_name: boutique.owner_name,
          address: boutique.address,
          hours: boutique.hours,
          cover_color: boutique.cover_color,
        }}
      />
    </div>
  );
}
