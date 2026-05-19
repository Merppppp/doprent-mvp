import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AvailabilityCalendar from "@/components/booking/AvailabilityCalendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ปฏิทินวันว่าง",
  robots: { index: false, follow: false },
};

export default async function DressCalendarPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(`/login?next=/sell/dresses/${params.id}/calendar`);

  const sb = createClient();
  const { data: boutique } = await sb
    .from("boutiques")
    .select("id, slug, kyc_status")
    .eq("owner_id", user.profile.id)
    .limit(1)
    .maybeSingle();
  if (!boutique) redirect("/sell/signup");
  if (boutique.kyc_status === "none" || boutique.kyc_status === "rejected") {
    redirect(`/sell/kyc?slug=${boutique.slug}`);
  }

  const { data: dress } = await sb
    .from("dresses")
    .select("id, name, designer, boutique_id, color, images")
    .eq("id", params.id)
    .maybeSingle();
  if (!dress || dress.boutique_id !== boutique.id) notFound();

  // Future blackouts
  const today = new Date().toISOString().slice(0, 10);
  const { data: blackoutData } = await sb
    .from("dress_blackouts")
    .select("date")
    .eq("dress_id", dress.id)
    .gte("date", today)
    .order("date", { ascending: true });
  const blackouts = ((blackoutData ?? []) as Array<{ date: string }>).map((r) => r.date);

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 640 }}>
      <Link href="/sell/dashboard" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        ← กลับ Dashboard
      </Link>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, margin: "12px 0 4px" }}>
        ปฏิทินวันว่าง · {dress.name}
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
        กดที่วันที่ที่ชุดนี้ <b>ไม่ว่าง</b> (เช่น มีลูกค้าจองอยู่แล้ว) ระบบจะบล็อกไม่ให้ลูกค้าเลือกวันนั้น
      </p>

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 18,
          background: "var(--surface)",
        }}
      >
        <AvailabilityCalendar dressId={dress.id} initialBlackouts={blackouts} />
      </div>

      <div style={{ marginTop: 20, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
        เคล็ดลับ: อัปเดตปฏิทินทุกครั้งหลังจบงานลูกค้า ลูกค้าใหม่จะเห็นวันที่จองชุดได้ทันที
      </div>
    </div>
  );
}
