"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    exact: true,
    icon: <Icon d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />,
  },
  {
    href: "/admin/metrics",
    label: "Metrics",
    icon: <Icon d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  {
    href: "/admin/kyc",
    label: "KYC Review",
    icon: <Icon d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />,
  },
  {
    href: "/admin/tag-requests",
    label: "คำขอแท็ก",
    icon: <Icon d="M7 7h10M7 11h6M5 3h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM12 17v-4m0 0l-2 2m2-2l2 2" />,
  },
  {
    href: "/admin/tag-groups",
    label: "ผูกกลุ่มแท็ก",
    icon: <Icon d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />,
  },
  {
    href: "/admin/bookings",
    label: "การจอง",
    icon: <Icon d="M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  },
  {
    href: "/admin/users",
    label: "ผู้ใช้",
    icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
  {
    href: "/admin/shops",
    label: "Shops",
    icon: <Icon d="M4 9l1-5h14l1 5M4 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 9v11h14V9M9 20v-6h6v6" />,
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: <Icon d="M9 3v3L5 14l4 7h6l4-7-4-8V3M9 6h6" />,
  },
  {
    href: "/admin/banners",
    label: "แบนเนอร์",
    icon: <Icon d="M4 5h16a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM4 14h16a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4a1 1 0 011-1z" />,
  },
  {
    href: "/admin/clicks",
    label: "LINE Clicks",
    icon: <Icon d="M4 12a8 8 0 1116 0 8 8 0 01-16 0zM12 8v4l3 2" />,
  },
  {
    href: "/admin/email-monitor",
    label: "Email Monitor",
    icon: <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />,
  },
  {
    href: "/admin/admins",
    label: "จัดการ Admin",
    icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
  {
    href: "/admin/settings",
    label: "ตั้งค่าเว็บ",
    icon: <Icon d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2zM12 15a3 3 0 100-6 3 3 0 000 6z" />,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="seller-mobile-bar">
        <button className="seller-hamburger" onClick={() => setDrawerOpen(true)} aria-label="เปิดเมนู">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div className="seller-brand">
          <Logo size={20} />
        </div>
      </div>

      {/* ── Backdrop ── */}
      {drawerOpen && <div className="seller-drawer-backdrop is-visible" onClick={() => setDrawerOpen(false)} />}

      {/* ── Sidebar / Drawer ── */}
      <aside className={`seller-side${drawerOpen ? " is-open" : ""}`}>
        <button className="seller-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="ปิดเมนู">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        <div className="seller-brand">
          <div>
            <Logo size={22} />
            <small>Admin Console</small>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`seller-nav-item${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="ic">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="seller-nav-spacer" />

        <Link href="/" className="seller-nav-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          สำรวจ DopRent
        </Link>

        <form action="/auth/signout" method="POST" style={{ padding: "0 8px 4px" }}>
          <button
            type="submit"
            className="seller-nav-back"
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", font: "inherit" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            ออกจากระบบ
          </button>
        </form>
      </aside>
    </>
  );
}
