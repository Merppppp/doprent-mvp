import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "สมัครเปิดร้าน — DopRent",
  robots: { index: false, follow: false },
};

export default async function SellSignupPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/signup");

  // If they already have a boutique, send to dashboard
  const sb = createClient();
  const { data: existing } = await sb
    .from("boutiques")
    .select("slug")
    .eq("owner_id", user.profile.id)
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/sell/dashboard");

  // Load areas for dropdown
  const { data: areasData } = await sb
    .from("areas")
    .select("key, th")
    .order("th", { ascending: true });
  const areas = (areasData ?? []) as Array<{ key: string; th: string }>;

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 680 }}>
      <h1
        className="page-title"
        style={{ fontSize: 30, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.01em" }}
      >
        เปิดร้านของคุณ
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 28 }}>
        ขั้นที่ 1/3 — กรอกข้อมูลร้าน (ขั้น 2: KYC, ขั้น 3: เพิ่มชุดแรก)
      </p>

      <SignupForm areas={areas} />
    </div>
  );
}
