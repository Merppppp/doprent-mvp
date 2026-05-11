import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell" style={{ padding: "96px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, fontWeight: 600 }}>ไม่พบชุดที่ค้นหา</h1>
      <p style={{ marginTop: 12, color: "var(--ink-2)" }}>
        ชุดอาจถูกถอดออกจากแคตตาล็อกแล้ว
      </p>
      <Link href="/browse" className="btn btn-dark" style={{ marginTop: 32 }}>
        ดูชุดอื่น ๆ
      </Link>
    </div>
  );
}
