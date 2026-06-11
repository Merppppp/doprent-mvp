import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { version } from "@/package.json";
import LocaleToggle from "./LocaleToggle";
import FooterVariantSwitch from "./FooterVariantSwitch";

const LINE_URL = process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent";

export default async function Footer() {
  const locale = getServerLocale();
  const year = new Date().getFullYear();

  return (
    <FooterVariantSwitch
      defaultFooter={<DefaultFooter locale={locale} year={year} />}
      sellerFooter={<SellerFooter locale={locale} year={year} />}
      adminFooter={<AdminFooter year={year} />}
    />
  );
}

/* ── Default: public / renter routes ─────────────────────────────── */

function DefaultFooter({ locale, year }: { locale: Locale; year: number }) {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "40px 0 16px",
        background: "var(--surface)",
        marginTop: 60,
      }}
    >
      <div className="container footer-grid" style={{ marginBottom: 28 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 10 }}>DopRent</div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
            {t("footer.tagline", locale)}
          </p>
        </div>
        <div>
          <h5 style={{ fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{t("footer.shop", locale)}</h5>
          <FooterLink href="/">{t("footer.allDresses", locale)}</FooterLink>
          <FooterLink href="/?occasion=engagement">{t("footer.engagement", locale)}</FooterLink>
          <FooterLink href="/?occasion=wedding">{t("footer.wedding", locale)}</FooterLink>
          <FooterLink href="/?occasion=cocktail">{t("footer.cocktail", locale)}</FooterLink>
          <FooterLink href="/?occasion=work">{t("footer.workDress", locale)}</FooterLink>
        </div>
        <div>
          <h5 style={{ fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{t("footer.forShops", locale)}</h5>
          <FooterLink href="/sell">{t("footer.openShop", locale)}</FooterLink>
          <FooterLink href="/sell/dashboard">{t("footer.myDashboard", locale)}</FooterLink>
          <FooterLink href="/boutiques">{t("footer.allBoutiques", locale)}</FooterLink>
        </div>
        <div>
          <h5 style={{ fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{t("footer.contact", locale)}</h5>
          <a
            href={LINE_URL}
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: "block", fontSize: 13, color: "var(--ink-2)", padding: "4px 0" }}
          >
            LINE @doprent
          </a>
          <a href="mailto:hello@doprent.com" style={{ display: "block", fontSize: 13, color: "var(--ink-2)", padding: "4px 0" }}>
            hello@doprent.com
          </a>
        </div>
      </div>
      <div
        className="container footer-bottom"
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 14,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          fontSize: 12,
          color: "var(--ink-3)",
          textAlign: "center",
        }}
      >
        <span>© {year} DopRent · Bangkok · v{version}</span>
        <span aria-hidden="true">·</span>
        <LocaleToggle defaultLocale={locale} variant="footer-inline" />
      </div>
    </footer>
  );
}

/* ── Seller: /sell/dashboard area ────────────────────────────────── */

function SellerFooter({ locale, year }: { locale: Locale; year: number }) {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "16px 0",
        background: "var(--surface)",
        marginTop: 60,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px 22px",
          flexWrap: "wrap",
          fontSize: 13,
        }}
      >
        <Link href="/sell/dashboard" style={{ color: "var(--ink-2)" }}>
          {t("footer.myDashboard", locale)}
        </Link>
        <Link href="/" style={{ color: "var(--ink-2)" }}>
          {t("footer.allDresses", locale)}
        </Link>
        <a href={LINE_URL} target="_blank" rel="noreferrer noopener" style={{ color: "var(--ink-2)" }}>
          LINE @doprent
        </a>
        <a href="mailto:hello@doprent.com" style={{ color: "var(--ink-2)" }}>
          hello@doprent.com
        </a>
      </div>
      <div
        className="container"
        style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}
      >
        © {year} DopRent · v{version}
      </div>
    </footer>
  );
}

/* ── Admin: /admin area ──────────────────────────────────────────── */

function AdminFooter({ year }: { year: number }) {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "14px 0",
        background: "var(--surface)",
        marginTop: 60,
      }}
    >
      <div className="container" style={{ textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>
        © {year} DopRent · v{version}
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
