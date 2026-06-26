"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/account", label: "สินค้าที่ถูกใจ", exact: true, icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
  { href: "/account/bookings", label: "การจองของฉัน", icon: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" },
  { href: "/account/profile", label: "โปรไฟล์", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { href: "/account/addresses", label: "ที่อยู่จัดส่ง", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" },
  { href: "/account/billing", label: "ข้อมูลใบกำกับภาษี", icon: "M1 4h22v16H1zM1 10h22" },
  { href: "/account/password", label: "รหัสผ่าน", icon: "M3 11h18v11H3zM7 11V7a5 5 0 0 1 10 0v4" },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AccountSidebar({
  user,
}: {
  user: { fullName: string | null; email: string; role: string };
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const initials = (user.fullName || user.email)
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentLabel = NAV.find((n) => isActive(pathname, n))?.label ?? "บัญชีของฉัน";

  const profileCard = (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 18,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          background: "var(--ink)",
          color: "var(--on-dark)",
          fontSize: 18,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        {initials || "?"}
      </div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>
        {user.fullName || user.email.split("@")[0]}
        {user.role === "admin" ? (
          <span
            style={{
              background: "var(--accent)",
              color: "var(--on-dark)",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              marginLeft: 6,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Admin
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, wordBreak: "break-all" }}>
        {user.email}
      </div>
    </div>
  );

  const navItems = (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`account-nav-item${active ? " account-nav-active" : ""}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const signoutBtn = (
    <>
      <div style={{ height: 1, background: "var(--line)", margin: "8px 0" }} />
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="account-nav-item"
          style={{ width: "100%", textAlign: "left", color: "var(--danger)", border: "none", background: "none", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          ออกจากระบบ
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* Mobile menu trigger is positioned beside the page title. */}
      <div className="account-mobile-bar">
        <button className="account-hamburger" onClick={() => setDrawerOpen(true)} aria-label="เปิดเมนู">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
      </div>

      {/* Mobile backdrop */}
      {drawerOpen && (
        <div
          className="account-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`account-drawer${drawerOpen ? " is-open" : ""}`}>
        <button className="account-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="ปิดเมนู">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        {profileCard}
        {navItems}
        {signoutBtn}
      </aside>

      {/* Desktop sidebar */}
      <aside className="account-sidebar-desktop">
        {profileCard}
        {navItems}
        {signoutBtn}
      </aside>
    </>
  );
}
