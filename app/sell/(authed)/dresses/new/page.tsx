import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listOccasions } from "@/lib/products";
import DressForm from "../DressForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "เพิ่มชุดใหม่",
  robots: { index: false, follow: false },
};

export default async function NewDressPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/dresses/new");

  const [raw, occasions] = await Promise.all([
    db.boutique.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true, name: true, lineUrl: true, kycStatus: true },
    }),
    listOccasions(),
  ]);
  if (!raw) redirect("/sell/signup");
  if (raw.kycStatus === "none" || raw.kycStatus === "rejected") {
    redirect(`/sell/kyc?slug=${raw.slug}`);
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 720 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 6px" }}>เพิ่มชุดใหม่</h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        ชุดจะเป็นสถานะ &ldquo;รอตรวจ&rdquo; จนกว่า admin จะอนุมัติ (ปกติ &lt; 24 ชม.)
      </p>
      <DressForm mode="create" boutiqueId={raw.id} defaultLineUrl={raw.lineUrl} occasions={occasions} />
    </div>
  );
}
