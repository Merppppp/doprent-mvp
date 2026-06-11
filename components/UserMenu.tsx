"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import LocaleToggle from "./LocaleToggle";
import { t, type Locale } from "@/lib/i18n";

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

export default function UserMenu({
  fullName,
  email,
  isAdmin,
  isSeller,
  initials,
  savedCount,
  renterBadge,
  sellerBadge,
  locale = "th",
}: {
  fullName: string;
  email: string;
  isAdmin: boolean;
  isSeller: boolean;
  initials: string;
  savedCount: number;
  renterBadge: number;
  sellerBadge: number;
  locale?: Locale;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Close the dropdown on outside click/touch or Escape — clicks inside the
  // menu must NOT close it before their action runs.
  useEffect(() => {
    const closeIfOutside = (e: MouseEvent | TouchEvent) => {
      const el = detailsRef.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) {
        el.open = false;
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    };
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={detailsRef} style={{ position: "relative" }}>
      <summary
        style={{
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px 0 4px",
          height: 38,
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
            width: 30,
            height: 30,
            borderRadius: 999,
            background: "var(--ink)",
            color: "var(--on-dark)",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials || "?"}
        </span>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>▼</span>
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
          <Link
            href="/account"
            style={{
              ...menuItemStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {t("menu.savedItems", locale)}
            {savedCount > 0 && <Pill n={savedCount} />}
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

        {/* ── Language ── */}
        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
        <div style={{ padding: "8px 16px" }}>
          <LocaleToggle defaultLocale={locale} variant="dropdown" />
        </div>

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
