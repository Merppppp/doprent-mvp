"use client";

type PrintToolbarProps = {
  backHref: string;
  title: string;
};

export default function PrintToolbar({ backHref, title }: PrintToolbarProps) {
  return (
    <div
      className="no-print"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 20px",
        background: "#fff",
        borderBottom: "1px solid var(--line)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <a
          href={backHref}
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← กลับ
        </a>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          เลือก &ldquo;บันทึกเป็น PDF&rdquo; ในหน้าต่างพิมพ์เพื่อดาวน์โหลดไฟล์
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 18px",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>
    </div>
  );
}
