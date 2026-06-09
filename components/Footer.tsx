import Link from "next/link";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { version } from "@/package.json";
import LocaleToggle from "./LocaleToggle";

export default async function Footer() {
  const locale = getServerLocale();

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
            {t("footer.sellLink", locale)}
          </Link>
          <LocaleToggle defaultLocale={locale} variant="footer" />
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>v{version}</span>
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
