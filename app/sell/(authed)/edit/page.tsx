import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import EditBoutiqueForm from "./EditBoutiqueForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "แก้ไขข้อมูลร้าน",
  robots: { index: false, follow: false },
};

export default async function EditShopPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/edit");

  const [raw, areasRaw] = await Promise.all([
    db.shop.findFirst({
      where: { ownerId: user.id },
      include: { area: { select: { key: true } } },
    }),
    db.area.findMany({ orderBy: { th: "asc" }, select: { key: true, th: true } }),
  ]);
  if (!raw) redirect("/sell/signup");

  const areas = areasRaw as Array<{ key: string; th: string }>;

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 680 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>← กลับ Dashboard</Link>
      <h1 className="page-title" style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 24px" }}>
        แก้ไขข้อมูลร้าน
      </h1>
      <EditBoutiqueForm
        areas={areas}
        boutique={{
          id: raw.id,
          name: raw.name,
          area_key: raw.area?.key ?? null,
          area_label: raw.areaLabel,
          line_url: raw.lineUrl,
          instagram: raw.instagram,
          since_year: raw.sinceYear,
          tag: raw.tag,
          story: raw.story,
          delivery_info: raw.deliveryInfo,
          owner_name: raw.ownerName,
          address: raw.address,
          hours: raw.hours,
          cover_color: raw.coverColor,
        }}
      />
    </div>
  );
}
