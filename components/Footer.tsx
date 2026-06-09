import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "40px 0 20px",
        background: "var(--surface)",
        marginTop: 60,
      }}
    >
      <div
        className="shell footer-grid"
        style={{ marginBottom: 28 }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>DopRent</div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
            เช่าชุดจากร้านเช่าในไทย จองตรงผ่าน LINE
          </p>
        </div>
        <div>
          <h5 style={{ fontSize: 13, marginBottom: 12, fontWeight: 600 }}>เลือกซื้อ</h5>
          <FooterLink href="/">ทุกชุด</FooterLink>
          <FooterLink href="/?occasion=engagement">งานหมั้น</FooterLink>
          <FooterLink href="/?occasion=wedding">งานแต่ง</FooterLink>
          <FooterLink href="/?occasion=cocktail">ค็อกเทล</FooterLink>
          <FooterLink href="/?occasion=work">ชุดทำงาน</FooterLink>
        </div>
        <div>
          <h5 style={{ fontSize: 13, marginBottom: 12, fontWeight: 600 }}>สำหรับร้านค้า</h5>
          <FooterLink href="/sell">เปิดร้านบน DopRent</FooterLink>
          <FooterLink href="/sell/dashboard">Dashboard ร้านของฉัน</FooterLink>
          <FooterLink href="/boutiques">ร้านเช่าทั้งหมด</FooterLink>
        </div>
        <div>
          <h5 style={{ fontSize: 13, marginBottom: 12, fontWeight: 600 }}>ติดต่อ</h5>
          <a
            href={process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent"}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: "block",
              fontSize: 13,
              color: "var(--ink-2)",
              padding: "4px 0",
            }}
          >
            LINE @doprent
          </a>
          <a href="mailto:hello@doprent.com" style={{ display: "block", fontSize: 13, color: "var(--ink-2)", padding: "4px 0" }}>
            hello@doprent.com
          </a>
        </div>
      </div>
      <div
        className="shell footer-bottom"
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 12,
          color: "var(--ink-3)",
        }}
      >
        <div>© {new Date().getFullYear()} DopRent · Bangkok</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/sell" style={{ color: "var(--ink-3)" }}>
            เปิดร้านขาย →
          </Link>
          <span>ปลั๊กปลั่กออนไลน์</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{ display: "block", fontSize: 13, color: "var(--ink-2)", padding: "4px 0" }}
    >
      {children}
    </Link>
  );
}
