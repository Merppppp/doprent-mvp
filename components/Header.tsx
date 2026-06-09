import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import MobileMenu from "./MobileMenu";
import { getBookingBadges } from "@/lib/booking-queries";
import Logo from "./Logo";
import NavbarSearch from "./NavbarSearch";
import NavCategoryRow from "./NavCategoryRow";
import LocaleToggle from "./LocaleToggle";
import { listOccasions } from "@/lib/dresses";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function Header() {
  const locale = getServerLocale();
  const user = await getCurrentUser().catch(() => null);

  const fullName = user?.name || user?.email.split("@")[0] || "";
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const savedCount = user?.savedDressIds?.length ?? 0;
  const badges = user ? await getBookingBadges() : { renter: 0, seller: 0 };
  const occasions = await listOccasions();

  return (
    <header
      style={{
        borderBottom: "1px solid #0d2b1f",
        background: "#1B4332",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* ── Main bar ─────────────────────────────────────────────────── */}
      <div
        className="shell"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingTop: 11,
          paddingBottom: 11,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="doprent"
          style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
        >
          <Logo size={22} />
        </Link>

        {/* Search bar — dominant center element */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: 680 }}>
          <NavbarSearch locale={locale} />
        </div>

        {/* Desktop right group */}
        <div
          className="nav-cta-desktop"
          style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}
        >
          {/* Open shop link */}
          <Link
            href="/sell/signup"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              padding: "6px 2px",
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
            className="hdr-sell-link"
          >
            {t("nav.openShop", locale)}
          </Link>

          {/* TH/EN toggle */}
          <LocaleToggle defaultLocale={locale} />

          {/* Auth actions */}
          {user ? (
            <>
              <SavedLink count={savedCount} locale={locale} />
              <UserMenu
                fullName={fullName}
                email={user.email}
                isAdmin={user.role === "admin"}
                isSeller={user.role === "seller" || user.role === "admin"}
                initials={initials}
                renterBadge={badges.renter}
                sellerBadge={badges.seller}
                locale={locale}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn btn-outline"
                style={{
                  padding: "8px 14px",
                  border: "1.5px solid rgba(255,255,255,0.4)",
                  color: "#fff",
                  background: "transparent",
                  fontSize: 13,
                }}
              >
                {t("nav.login", locale)}
              </Link>
              <Link href="/signup" className="btn btn-dark" style={{ fontSize: 13 }}>
                {t("nav.signup", locale)}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <MobileMenu
          locale={locale}
          user={
            user
              ? {
                  fullName,
                  email: user.email,
                  isAdmin: user.role === "admin",
                  isSeller: user.role === "seller" || user.role === "admin",
                  initials,
                  savedCount,
                  renterBadge: badges.renter,
                  sellerBadge: badges.seller,
                }
              : null
          }
        />
      </div>

      {/* ── Category row ─────────────────────────────────────────────── */}
      <NavCategoryRow occasions={occasions} locale={locale} />

      <style dangerouslySetInnerHTML={{ __html: `
        header details > div a { color: var(--ink) !important; }
        header details > div button { color: var(--ink) !important; }
        .hdr-sell-link:hover { color: #fff !important; }
      ` }} />
    </header>
  );
}

// ── SavedLink ────────────────────────────────────────────────────────────────

import type { Locale } from "@/lib/i18n";

function SavedLink({ count, locale = "th" }: { count: number; locale?: Locale }) {
  const aria = `${t("nav.savedAria", locale)}${count > 0 ? ` (${count})` : ""}`;
  return (
    <Link
      href="/account"
      aria-label={aria}
      title={t("nav.savedAria", locale)}
      style={{
        position: "relative",
        width: 38,
        height: 38,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.1)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        flexShrink: 0,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={count > 0 ? "var(--save)" : "none"}
        stroke={count > 0 ? "var(--save)" : "#fff"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count > 0 ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: "#fff",
            color: "#1B4332",
            fontSize: 10,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

// ── Pill badge ───────────────────────────────────────────────────────────────

function Pill({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span
      style={{
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 999,
        background: "var(--accent)",
        color: "var(--accent-ink)",
        fontSize: 11,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

// ── UserMenu ─────────────────────────────────────────────────────────────────

function UserMenu({
  fullName,
  email,
  isAdmin,
  isSeller,
  initials,
  renterBadge,
  sellerBadge,
  locale = "th",
}: {
  fullName: string;
  email: string;
  isAdmin: boolean;
  isSeller: boolean;
  initials: string;
  renterBadge: number;
  sellerBadge: number;
  locale?: Locale;
}) {
  return (
    <details style={{ position: "relative" }}>
      <summary
        style={{
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px 6px 6px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.12)",
          cursor: "pointer",
          color: "rgba(255,255,255,0.9)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "var(--ink)",
            color: "var(--on-dark)",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials || "?"}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {fullName.split(" ")[0]}
        </span>
        <span style={{ color: "rgba(255,255,255,0.7)", marginRight: 4, fontSize: 10 }}>▼</span>
        {renterBadge + sellerBadge > 0 ? <Pill n={renterBadge + sellerBadge} /> : null}
      </summary>

      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          minWidth: 220,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          zIndex: 30,
        }}
      >
        {/* Header — name + email */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {fullName}
            {isAdmin ? (
              <span
                style={{
                  background: "var(--info)",
                  color: "var(--on-dark)",
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 3,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginLeft: 4,
                }}
              >
                Admin
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{email}</div>
        </div>

        {/* ── Group 1: all users ── */}
        <div style={{ paddingTop: 4, paddingBottom: 4 }}>
          <Link
            href="/account/bookings"
            style={{
              ...menuItemStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {t("menu.myBookings", locale)}
            <Pill n={renterBadge} />
          </Link>
          <Link href="/account" style={menuItemStyle}>
            {t("menu.savedItems", locale)}
          </Link>
          <Link href="/boutiques" style={menuItemStyle}>
            {t("menu.likedShops", locale)}
          </Link>
          <Link href="/account" style={menuItemStyle}>
            {t("menu.myAccount", locale)}
          </Link>
        </div>

        {/* ── Group 2: Manage shop (seller only) ── */}
        {isSeller && !isAdmin && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <div
              style={{
                padding: "8px 16px 4px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {t("menu.manageShop", locale)}
            </div>
            <Link href="/sell/dashboard" style={menuItemStyle}>
              {t("menu.shopDashboard", locale)}
            </Link>
            <Link
              href="/sell/bookings"
              style={{
                ...menuItemStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {t("menu.shopBookings", locale)}
              <Pill n={sellerBadge} />
            </Link>
          </>
        )}

        {/* ── Group 3: Admin (admin only) ── */}
        {isAdmin && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <div
              style={{
                padding: "8px 16px 4px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {t("menu.manageShop", locale)}
            </div>
            <Link href="/sell/dashboard" style={menuItemStyle}>
              {t("menu.shopDashboard", locale)}
            </Link>
            <Link
              href="/sell/bookings"
              style={{
                ...menuItemStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {t("menu.shopBookings", locale)}
              <Pill n={sellerBadge} />
            </Link>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <div
              style={{
                padding: "8px 16px 4px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--info)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Admin
            </div>
            <Link
              href="/admin"
              style={{ ...menuItemStyle, color: "var(--info)", fontWeight: 500 }}
            >
              Admin Dashboard
            </Link>
          </>
        )}

        {/* ── Sign out ── */}
        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
        <form action="/auth/signout" method="POST">
          <button type="submit" style={{ ...menuItemStyle, width: "100%", textAlign: "left" }}>
            {t("menu.signOut", locale)}
          </button>
        </form>
      </div>
    </details>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  fontSize: 14,
  color: "var(--ink)",
  cursor: "pointer",
};
