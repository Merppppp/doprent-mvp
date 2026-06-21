import Link from "next/link";
import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

import { getBookingBadges } from "@/lib/booking-queries";
import Logo from "./Logo";
import NavbarSearch from "./NavbarSearch";
import UserMenu from "./UserMenu";
import DetailsAutoClose from "./DetailsAutoClose";
import LocaleToggle from "./LocaleToggle";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function Header() {
  const locale = getServerLocale();
  const user = await getCurrentUser().catch(() => null);

  // Staff principals have a synthetic session id ("staff:<id>") that getCurrentUser
  // can't resolve to a users row, so it returns null. Detect the staff session
  // separately so the global nav reflects the logged-in staff (name + shop dashboard
  // + sign out) instead of falsely showing the logged-out "เข้าสู่ระบบ" button.
  const staffSession = user ? null : await auth().catch(() => null);
  const staff = staffSession?.user?.role === "staff" ? staffSession.user : null;
  const staffName = staff?.name?.split(" ")[0] || "พนักงาน";

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
  const isAdmin = user?.role === "admin";
  // Shop ownership is independent of role: an admin can ALSO own a shop. Derive
  // it from actual ownership (not the single Role enum) so an admin-with-shop
  // still sees the "manage shop" surfaces. This gate is purely for display;
  // real authorization lives in route guards and server actions.
  const hasShop = user
    ? (await db.shop.findFirst({
        where: { ownerId: user.id },
        select: { id: true },
      })) !== null
    : false;
  const isSeller = user?.role === "seller";

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
          {staff && (
            <Link href="/sell/dashboard" style={topLinkStyle}>
              {t("menu.shopDashboard", locale)}
            </Link>
          )}
          {!staff && !hasShop && !isAdmin && (
            <Link href="/sell/signup" style={topLinkStyle}>
              {t("nav.openShop", locale)}
            </Link>
          )}
          {hasShop && (
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
          ) : staff ? (
            <>
              <span style={topDividerStyle}>|</span>
              <span style={{ ...topLinkStyle, fontWeight: 500 }}>{staffName} · พนักงาน</span>
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

        {/* Right — icons + profile / auth */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {user ? (
            <>
              {/* Bookings icon */}
              <Link
                href="/account/bookings"
                aria-label={t("menu.myBookings", locale)}
                title={t("menu.myBookings", locale)}
                style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, color: "rgba(255,255,255,0.85)" }}
                className="hdr-icon-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {badges.renter > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 4px", lineHeight: 1 }}>
                    {badges.renter > 9 ? "9+" : badges.renter}
                  </span>
                )}
              </Link>
              {/* Favorites icon */}
              <Link
                href="/account"
                aria-label={t("menu.savedItems", locale)}
                title={t("menu.savedItems", locale)}
                style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, color: "rgba(255,255,255,0.85)" }}
                className="hdr-icon-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={savedCount > 0 ? "rgba(255,255,255,0.85)" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              </Link>
            </>
          ) : null}
          {user ? (
            <UserMenu
              fullName={fullName}
              email={user.email}
              isAdmin={user.role === "admin"}
              isSeller={isSeller}
              hasShop={hasShop}
              initials={initials}
              savedCount={savedCount}
              renterBadge={badges.renter}
              sellerBadge={badges.seller}
              locale={locale}
            />
          ) : staff ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/sell/dashboard"
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
                {t("menu.shopDashboard", locale)}
              </Link>
              <form action="/auth/signout" method="POST" style={{ display: "inline-flex" }}>
                <button
                  type="submit"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    background: "transparent",
                    padding: "0 12px",
                    height: 38,
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    border: "1px solid rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}
                >
                  {t("menu.signOut", locale)}
                </button>
              </form>
            </div>
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

      {/* ═══ BOTTOM ROW ═══ (category nav) */}
      <div
        style={{
          background: "rgba(0,0,0,0.10)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          className="container hdr-cats"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minHeight: 46,
            overflow: "visible",
          }}
        >
          {/* Product-type dropdown — left, styled as a menu button */}
          <details className="hdr-cat-details" style={{ position: "relative", flexShrink: 0 }}>
            <summary className="hdr-cat-trigger" style={{ ...catTriggerStyle, listStyle: "none" }}>
              <span className="hdr-burger" aria-hidden="true">
                <span /><span /><span />
              </span>
              {locale === "en" ? "All categories" : "หมวดหมู่ทั้งหมด"}
              <span className="hdr-cat-caret" style={{ fontSize: 9, opacity: 0.85 }}>▾</span>
            </summary>
            <div className="hdr-cat-dropdown" style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              minWidth: 230,
              boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
              zIndex: 50,
              padding: "8px 0",
            }}>
              {PRODUCT_CATEGORIES.map((cat) => (
                <div key={cat.key}>
                  {cat.active ? (
                    <>
                      <div style={{ ...catDropdownItemStyle, fontWeight: 700, cursor: "default", paddingBottom: 2, color: "var(--ink-3)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {locale === "en" ? cat.en : cat.th}
                      </div>
                      <Link href={cat.href} className="hdr-dd-item" style={{ ...catDropdownItemStyle, paddingLeft: 24, fontWeight: 600 }}>
                        {locale === "en" ? "All" : "ทั้งหมด"}
                      </Link>
                      {cat.subs.map((sub) => (
                        <Link key={sub.key} href={sub.href} className="hdr-dd-item" style={{ ...catDropdownItemStyle, paddingLeft: 24 }}>
                          {locale === "en" ? sub.en : sub.th}
                        </Link>
                      ))}
                    </>
                  ) : (
                    <span style={{ ...catDropdownItemStyle, opacity: 0.4, cursor: "default", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {locale === "en" ? cat.en : cat.th}
                      <span style={comingSoonBadge}>Soon</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>
          <DetailsAutoClose selector="details.hdr-cat-details" />

          <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)", flexShrink: 0, margin: "0 2px" }} />

          {/* Occasion quick-links — scrollable, a different taxonomy from product type */}
          <nav className="hdr-quick" style={{ display: "flex", alignItems: "center", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
            <span style={{ ...catLinkStyle, color: "rgba(255,255,255,0.55)", fontWeight: 500, padding: "4px 6px 4px 4px", cursor: "default" }}>
              {locale === "en" ? "By occasion:" : "ตามโอกาส:"}
            </span>
            {QUICK_OCCASIONS.map((q) => (
              <Link key={q.key} href={q.href} className="hdr-cat-link" style={catLinkStyle}>
                {locale === "en" ? q.en : q.th}
              </Link>
            ))}
          </nav>

          {/* Right — shops CTA */}
          <Link href="/shops" className="hdr-cat-link hdr-shops-link" style={{ ...catLinkStyle, flexShrink: 0, fontWeight: 600 }}>
            {locale === "en" ? "All shops →" : "ร้านค้าทั้งหมด →"}
          </Link>
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
        /* category menu button */
        .hdr-cat-trigger:hover { background: rgba(255,255,255,0.26) !important; }
        .hdr-cat-details[open] .hdr-cat-trigger { background: rgba(255,255,255,0.30) !important; }
        .hdr-cat-details[open] .hdr-cat-caret { transform: rotate(180deg); }
        .hdr-burger { display: inline-flex; flex-direction: column; justify-content: center; gap: 3px; width: 14px; }
        .hdr-burger span { display: block; height: 2px; border-radius: 2px; background: currentColor; }
        .hdr-quick { scrollbar-width: none; }
        .hdr-quick::-webkit-scrollbar { display: none; }
        .hdr-shops-link:hover { background: rgba(255,255,255,0.12); }
        .hdr-icon-btn:hover { background: rgba(255,255,255,0.12); }
        @media(max-width:768px) {
          .hdr-top-row { display: none !important; }
          .hdr-quick { -webkit-overflow-scrolling: touch; }
        }
      ` }} />
    </header>
  );
}

// ── (UserMenu lives in components/UserMenu.tsx — client component with
//     outside-click / Escape close behavior) ──────────────────────────────────


const PRODUCT_CATEGORIES = [
  {
    key: "clothing", th: "เสื้อผ้า / ชุด", en: "Clothing", icon: "👗", href: "/#results", active: true,
    subs: [
      // "ชุด" / "ทั้งหมด" lead to the param-less homepage (dress is the default
      // type), so they carry the #results hash — otherwise ScrollToResults has
      // no query param to react to and the page stays stuck on the hero banner.
      { key: "dress", th: "ชุด", en: "Dress", href: "/#results" },
      { key: "suit", th: "สูท", en: "Suit", href: "/?type=suit" },
    ],
  },
  { key: "bags", th: "กระเป๋า", en: "Bags", icon: "👜", href: "#", active: false, subs: [] },
  { key: "accessories", th: "เครื่องประดับ", en: "Accessories", icon: "💍", href: "#", active: false, subs: [] },
  { key: "shoes", th: "รองเท้า", en: "Shoes", icon: "👠", href: "#", active: false, subs: [] },
  { key: "electronics", th: "อิเล็กทรอนิกส์", en: "Electronics", icon: "📱", href: "#", active: false, subs: [] },
  { key: "cameras", th: "กล้อง", en: "Cameras", icon: "📷", href: "#", active: false, subs: [] },
];

// Popular occasions surfaced inline in the category bar (different taxonomy from
// product type — these filter by ?occasion=, while the dropdown picks dress/suit).
const QUICK_OCCASIONS = [
  { key: "wedding", th: "งานแต่ง", en: "Wedding", href: "/?occasion=wedding" },
  { key: "engagement", th: "งานหมั้น", en: "Engagement", href: "/?occasion=engagement" },
  { key: "evening", th: "ราตรี", en: "Evening", href: "/?occasion=evening" },
  { key: "gala", th: "กาล่า", en: "Gala", href: "/?occasion=gala" },
  { key: "cocktail", th: "ค็อกเทล", en: "Cocktail", href: "/?occasion=cocktail" },
  { key: "thai", th: "ชุดไทย", en: "Thai", href: "/?occasion=thai" },
];

const catTriggerStyle: React.CSSProperties = {
  color: "#fff",
  background: "rgba(255,255,255,0.16)",
  textDecoration: "none",
  fontSize: 12.5,
  fontWeight: 600,
  padding: "7px 14px",
  borderRadius: 999,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  cursor: "pointer",
  transition: "background 0.15s",
};

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

