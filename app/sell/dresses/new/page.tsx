import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listOccasions } from "@/lib/dresses";
import DressForm from "../DressForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เพิ่มชุดใหม่ — DopRent",
  robots: { index: false, follow: false },
};

export default async function NewDressPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/dresses/new");

  const sb = createClient();
  const { data: boutique } = await sb
    .from("boutiques")
    .select("id, name, line_url")
    .eq("owner_id", user.profile.id)
    .limit(1)
    .maybeSingle();
  if (!boutique) redirect("/sell/signup");

  const occasions = await listOccasions();

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 720 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        ← กลับ Dashboard
      </Link>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 6px" }}>
        เพิ่มชุดใหม่
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        ชุดจะเป็นสถานะ &ldquo;รอตรวจ&rdquo; จนกว่า admin จะอนุมัติ (ปกติ &lt; 24 ชม.)
      </p>
      <DressForm
        mode="create"
        boutiqueId={boutique.id}
        defaultLineUrl={boutique.line_url}
        occasions={occasions}
      />
    </div>
  );
}
