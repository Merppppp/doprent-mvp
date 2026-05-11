import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell" style={{ padding: "96px 24px", textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.12em" }}>404</p>
      <h1 style={{ marginTop: 12, fontSize: 32, fontWeight: 600 }}>ไม่พบหน้าที่ค้นหา</h1>
      <p style={{ marginTop: 12, color: "var(--ink-2)" }}>ลิงก์อาจเปลี่ยนไปหรือถูกลบ</p>
      <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/browse" className="btn btn-dark">
          ดูชุดทั้งหมด
        </Link>
        <Link href="/" className="btn btn-outline">
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
