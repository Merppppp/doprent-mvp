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
      select: {
        id: true,
        name: true,
        areaLabel: true,
        lineUrl: true,
        instagram: true,
        facebook: true,
        twitter: true,
        tiktok: true,
        promptpayId: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
        bankbookImagePath: true,
        sinceYear: true,
        tag: true,
        story: true,
        deliveryInfo: true,
        ownerName: true,
        address: true,
        hours: true,
        coverColor: true,
        leadTimeDays: true,
        minRentalDays: true,
        maxRentalDays: true,
        returnWindowDays: true,
        bufferDaysAfter: true,
        closedWeekdays: true,
        area: { select: { key: true } },
        closedDates: { select: { date: true, note: true }, orderBy: { date: "asc" } },
      },
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
          facebook: raw.facebook,
          twitter: raw.twitter,
          tiktok: raw.tiktok,
          promptpay_id: raw.promptpayId,
          bank_name: raw.bankName,
          bank_account_number: raw.bankAccountNumber,
          bank_account_name: raw.bankAccountName,
          bankbook_image_path: raw.bankbookImagePath,
          since_year: raw.sinceYear,
          tag: raw.tag,
          story: raw.story,
          delivery_info: raw.deliveryInfo,
          owner_name: raw.ownerName,
          address: raw.address,
          hours: raw.hours,
          cover_color: raw.coverColor,
          // Booking policy fields
          lead_time_days: raw.leadTimeDays,
          min_rental_days: raw.minRentalDays,
          max_rental_days: raw.maxRentalDays,
          return_window_days: raw.returnWindowDays,
          buffer_days_after: raw.bufferDaysAfter,
          closed_weekdays: raw.closedWeekdays,
          closed_dates: raw.closedDates.map((cd) => ({
            date: cd.date.toISOString().slice(0, 10),
            note: cd.note ?? "",
          })),
        }}
      />
    </div>
  );
}
