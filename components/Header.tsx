import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        className="shell"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "14px 24px",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.01em",
          }}
        >
          DopRent
        </Link>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 14,
            color: "var(--ink-2)",
          }}
        >
          <Link href="/browse" style={{ padding: "6px 0" }}>
            เลือกชุด
          </Link>
          <Link href="/boutiques" style={{ padding: "6px 0" }}>
            ร้านเช่า
          </Link>
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent"}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-outline"
          >
            ติดต่อ LINE
          </a>
        </div>
      </div>
    </header>
  );
}
