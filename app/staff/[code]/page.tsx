import { db } from "@/lib/db";
import StaffLoginForm from "./StaffLoginForm";

export const dynamic = "force-dynamic";

export default async function StaffCodeLoginPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase().trim();

  const shop = await db.shop.findUnique({
    where: { staffLoginCode: code },
    select: { name: true },
  });

  if (!shop) {
    return (
      <div
        style={{
          maxWidth: 400,
          margin: "0 auto",
          padding: "48px 20px 80px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "var(--danger-soft)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 14,
          }}
        >
          ⚠️
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>ลิงก์ไม่ถูกต้อง</h1>
        <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
          QR โค้ดนี้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอ QR ใหม่จากเจ้าของร้าน
        </p>
      </div>
    );
  }

  return <StaffLoginForm shopName={shop.name} loginCode={code} />;
}
