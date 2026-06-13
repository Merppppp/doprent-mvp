import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getSellerCalendarData } from "@/lib/seller-calendar";
import SellerCalendar from "@/components/SellerCalendar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ปฏิทินร้าน",
  robots: { index: false, follow: false },
};

export default async function SellerCalendarPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/calendar");

  const data = await getSellerCalendarData();
  if (!data) redirect("/sell/signup");

  return (
    <div style={{ paddingTop: 8, paddingBottom: 80 }}>
      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <h1
          className="page-title"
          style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}
        >
          ปฏิทินร้าน
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0 }}>
          ภาพรวมการจอง, วันปิดสินค้า และวันหยุดร้านทั้งหมด
        </p>
      </div>

      {/* Calendar client component */}
      <SellerCalendar data={data} />

      {/* Footer hint */}
      <div
        style={{
          marginTop: 24,
          padding: "12px 16px",
          background: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          fontSize: 13,
          color: "var(--ink-3)",
          lineHeight: 1.7,
        }}
      >
        💡 ต้องการปิดสินค้าเป็นรายชิ้น?{" "}
        <a
          href="/sell/products"
          style={{ color: "var(--cobalt)", textDecoration: "underline" }}
        >
          ไปที่ สินค้า → จัดการปฏิทิน
        </a>{" "}
        ต้องการเพิ่มวันหยุดร้าน?{" "}
        <a
          href="/sell/edit"
          style={{ color: "var(--cobalt)", textDecoration: "underline" }}
        >
          แก้ไขร้าน
        </a>
      </div>
    </div>
  );
}
