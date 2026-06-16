import Link from "next/link";

export default function StaffLoginIndexPage() {
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
          background: "var(--accent-soft)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          marginBottom: 14,
        }}
      >
        📱
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>เข้าสู่ระบบพนักงาน</h1>
      <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 20, lineHeight: 1.6 }}>
        กรุณาสแกน QR Code ของร้านของคุณเพื่อเข้าสู่ระบบ
        <br />
        หากไม่มี QR ให้ขอจากเจ้าของร้าน
      </p>
      <Link href="/login" style={{ fontSize: 13, color: "var(--ink-3)" }}>
        ← กลับหน้าเข้าสู่ระบบปกติ
      </Link>
    </div>
  );
}
