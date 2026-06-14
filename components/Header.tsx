import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

import { getBookingBadges } from "@/lib/booking-queries";
import Logo from "./Logo";
import NavbarSearch from "./NavbarSearch";
import UserMenu from "./UserMenu";
import LocaleToggle from "./LocaleToggle";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function Header() {
  const locale = getServerLocale();
  const user = await getCurrentUser().catch(() => null);

  const fullName = user?.fullName || user?.email.split("@")[0] || "";
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const savedCount = user?.savedProductIds?.length ?? 0;
  const badges = user ? await getBookingBadges() : { renter: 0, seller: 0 };
  // isSeller and isAdmin are mutually exclusive (Role enum has no overlap).
  // A user with role "admin" is NOT treated as a seller — admins manage the
  // platform and do not own shops. This gate is purely for display; real
  // authorization lives in route guards and server actions.
  const isSeller = user?.role === "seller";
  const isAdmin = user?.role === "admin";

  return (
    <header
      className="sticky top-0 z-40 bg-[rgba(46,156,101,0.95)] backdrop-blur-[12px] border-b border-b-[rgba(23,92,58,0.3)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.1)]"
    >
      {/* ═══ TOP ROW ═══ (28px — utility links) */}
      <div
        className="container hdr-top-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 28,
          fontSize: 12,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isSeller && !isAdmin && (
            <Link href="/sell/signup" style={topLinkStyle}>
              {t("nav.openShop", locale)}
            </Link>
          )}
          {isSeller && (
            <Link href="/sell/dashboard" style={topLinkStyle}>
              {t("menu.shopDashboard", locale)}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" style={topLinkStyle}>
              Admin
            </Link>
          )}
          <span style={topDividerStyle}>|</span>
          <span style={{ ...topLinkStyle, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {t("nav.followUs", locale)}
            <a href="https://instagram.com/doprent" target="_blank" rel="noreferrer" style={topIconLinkStyle} aria-label="Instagram">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href={process.env.NEXT_PUBLIC_DEFAULT_LINE_URL ?? "https://line.me/R/ti/p/@doprent"} target="_blank" rel="noreferrer" style={topIconLinkStyle} aria-label="LINE">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.813 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.309 14.244 24 12.382 24 10.304zm-16.5 3.146a.348.348 0 01-.348.348H4.848a.348.348 0 01-.348-.348V8.196a.348.348 0 01.348-.348h.696a.348.348 0 01.348.348v4.558h1.609a.348.348 0 01.348.348v.348zm2.088-.348a.348.348 0 01-.348.348h-.696a.348.348 0 01-.348-.348V8.196a.348.348 0 01.348-.348h.696a.348.348 0 01.348.348v4.906zm6.26 0a.348.348 0 01-.348.348h-.696a.348.348 0 01-.272-.131l-1.992-2.692v2.475a.348.348 0 01-.348.348h-.696a.348.348 0 01-.348-.348V8.196a.348.348 0 01.348-.348h.696c.104 0 .2.046.265.127l1.996 2.697V8.196a.348.348 0 01.348-.348h.696a.348.348 0 01.348.348v4.906zm3.152-3.862a.348.348 0 01-.348.348h-1.609v.984h1.609a.348.348 0 01.348.348v.696a.348.348 0 01-.348.348h-2.304a.348.348 0 01-.348-.348V8.196a.348.348 0 01.348-.348h2.304a.348.348 0 01.348.348v.696a.348.348 0 01-.348.348h-1.609v.984h1.609a.348.348 0 01.348.348v.068z"/></svg>
            </a>
          </span>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LocaleToggle defaultLocale={locale} variant="navbar-top" />
          {user ? (
            <>
              <span style={topDividerStyle}>|</span>
              <span style={{ ...topLinkStyle, fontWeight: 500 }}>{fullName.split(" ")[0]}</span>
            </>
          ) : (
            <>
              <span style={topDividerStyle}>|</span>
              <Link href="/signup" style={topLinkStyle}>{t("nav.signup", locale)}</Link>
            </>
          )}
        </div>
      </div>

      {/* ═══ MIDDLE ROW ═══ (48px — logo + search + profile) */}
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          height: 52,
        }}
      >
        {/* Logo — left */}
        <Link
          href="/"
          aria-label="doprent"
          style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
        >
          <Logo size={26} />
        </Link>

        {/* Search — center (desktop only) */}
        <div className="hidden md:block" style={{ flex: 1, minWidth: 0, maxWidth: 620 }}>
          <NavbarSearch locale={locale} />
        </div>

        {/* Right — profile / auth */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          {user ? (
            <UserMenu
              fullName={fullName}
              email={user.email}
              isAdmin={user.role === "admin"}
              isSeller={isSeller}
              initials={initials}
              savedCount={savedCount}
              renterBadge={badges.renter}
              sellerBadge={badges.seller}
              locale={locale}
            />
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#4A6B5A",
                  background: "#fff",
                  padding: "0 16px",
                  height: 38,
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  border: "1px solid #fff",
                }}
              >
                {t("nav.login", locale)}
              </Link>
            </>
          )}
        </div>

      </div>

      {/* ═══ MOBILE SEARCH ROW ═══ */}
      <div className="block md:hidden border-t border-t-[rgba(255,255,255,0.08)] px-4 py-2">
        <NavbarSearch locale={locale} />
      </div>

      {/* ═══ BOTTOM ROW ═══ (32px — product categories) */}
      <div
        style={{
          background: "rgba(0,0,0,0.08)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          height: 40,
          padding: "4px 0",
        }}
      >
        <div
          className="container hdr-cats"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 0,
            overflow: "hidden",
          }}
        >
          {/* Product type dropdown */}
          <details className="hdr-cat-details" style={{ position: "relative", flexShrink: 0 }}>
            <summary
              className="hdr-cat-link hdr-cat-active"
              style={{ ...catLinkStyle, listStyle: "none", fontWeight: 600 }}
            >
              {PRODUCT_CATEGORIES[0].icon} {locale === "en" ? PRODUCT_CATEGORIES[0].en : PRODUCT_CATEGORIES[0].th}
              <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }}>▼</span>
            </summary>
            <div className="hdr-cat-dropdown" style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              minWidth: 200,
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              zIndex: 50,
              padding: "8px 0",
            }}>
              {PRODUCT_CATEGORIES.map((cat) => (
                <span key={cat.key}>
                  {cat.active ? (
                    <Link href={cat.href} style={{ ...catDropdownItemStyle, fontWeight: 600 }}>
                      {cat.icon} {locale === "en" ? cat.en : cat.th}
                    </Link>
                  ) : (
                    <span style={{ ...catDropdownItemStyle, opacity: 0.45, cursor: "default" }}>
                      {cat.icon} {locale === "en" ? cat.en : cat.th}
                      <span style={comingSoonBadge}>Soon</span>
                    </span>
                  )}
                </span>
              ))}
            </div>
          </details>

          {/* Divider */}
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, margin: "0 8px" }}>|</span>

          {/* Sub-categories of active product type */}
          <div className="hdr-subs" style={{ display: "flex", alignItems: "center", gap: 2, overflow: "hidden" }}>
            <Link href={PRODUCT_CATEGORIES[0].href} className="hdr-cat-link" style={{ ...catLinkStyle, opacity: 0.7 }}>
              {locale === "en" ? "All" : "ทั้งหมด"}
            </Link>
            {PRODUCT_CATEGORIES[0].subs.map((sub) => (
              <Link key={sub.key} href={sub.href} className="hdr-cat-link" style={catLinkStyle}>
                {locale === "en" ? sub.en : sub.th}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        header details > div a { color: var(--ink) !important; }
        header details > div button { color: var(--ink) !important; }
        .hdr-sell-link:hover { color: #fff !important; }
        .hdr-top-row a:hover { color: #fff !important; }
        .hdr-trend-link:hover { color: #fff !important; }
        .hdr-trending::-webkit-scrollbar { display: none; }
        .hdr-cat-link:hover { background: rgba(255,255,255,0.12); }
        .hdr-cat-active { background: rgba(255,255,255,0.18) !important; color: #fff !important; }
        .hdr-cat-details > summary::-webkit-details-marker { display: none; }
        .hdr-cat-details > summary::marker { content: ""; }
        .hdr-cat-dropdown a:hover { background: var(--bg-hover, rgba(0,0,0,0.04)); }
        @media(max-width:768px) {
          .hdr-top-row { display: none !important; }
          .hdr-subs { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .hdr-subs::-webkit-scrollbar { display: none; }
        }
      ` }} />
    </header>
  );
}

// ── (UserMenu lives in components/UserMenu.tsx — client component with
//     outside-click / Escape close behavior) ──────────────────────────────────


const PRODUCT_CATEGORIES = [
  {
    key: "clothing", th: "เสื้อผ้า / ชุด", en: "Clothing", icon: "👗", href: "/", active: true,
    subs: [
      { key: "evening", th: "ชุดราตรี", en: "Evening Dress", href: "/?cat=evening" },
      { key: "thai", th: "ชุดไทย", en: "Thai Dress", href: "/?cat=thai" },
      { key: "wedding", th: "ชุดแต่งงาน", en: "Wedding Dress", href: "/?cat=wedding" },
      { key: "casual", th: "ชุดลำลอง", en: "Casual", href: "/?cat=casual" },
      { key: "costume", th: "ชุดคอสตูม / แฟนซี", en: "Costume / Fancy", href: "/?cat=costume" },
      { key: "graduation", th: "ชุดรับปริญญา", en: "Graduation", href: "/?cat=graduation" },
    ],
  },
  { key: "bags", th: "กระเป๋า", en: "Bags", icon: "👜", href: "#", active: false, subs: [] },
  { key: "accessories", th: "เครื่องประดับ", en: "Accessories", icon: "💍", href: "#", active: false, subs: [] },
  { key: "shoes", th: "รองเท้า", en: "Shoes", icon: "👠", href: "#", active: false, subs: [] },
  { key: "electronics", th: "อิเล็กทรอนิกส์", en: "Electronics", icon: "📱", href: "#", active: false, subs: [] },
  { key: "cameras", th: "กล้อง", en: "Cameras", icon: "📷", href: "#", active: false, subs: [] },
];

const catLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.85)",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 500,
  padding: "4px 12px",
  borderRadius: 999,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  transition: "background 0.15s",
};

const comingSoonBadge: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  background: "rgba(255,255,255,0.2)",
  color: "rgba(255,255,255,0.8)",
  padding: "1px 5px",
  borderRadius: 999,
  marginLeft: 4,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const catDropdownItemStyle: React.CSSProperties = {
  display: "block",
  padding: "8px 16px",
  fontSize: 13,
  color: "var(--ink)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const topLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.75)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  fontSize: 12,
};

const topDividerStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.2)",
  fontSize: 11,
};

const topIconLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.75)",
  display: "inline-flex",
  alignItems: "center",
};

