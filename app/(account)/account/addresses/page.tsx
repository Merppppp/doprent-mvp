import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AddressManager from "@/components/AddressManager";
import { getCurrentUser } from "@/lib/auth";
import { getMyAddresses } from "@/lib/booking-queries";

export const metadata: Metadata = { title: "ที่อยู่จัดส่ง", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account/addresses")}`);

  const addresses = await getMyAddresses();

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 4 }}>
        ที่อยู่จัดส่ง
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 16 }}>
        จัดการที่อยู่สำหรับจัดส่งชุด · ที่อยู่เริ่มต้นจะถูกเลือกให้อัตโนมัติตอนจอง
      </p>
      <AddressManager addresses={addresses} />
    </>
  );
}
