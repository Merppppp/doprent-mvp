"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";
import { toggleShopOpen } from "@/app/actions/seller";

/* ── Icon helper (inline SVG path) ── */
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

/* ── Nav item type ── */
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** Match only when pathname === href (default: prefix match) */
  exact?: boolean;
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/* ── Nav definitions ── */
const BASE_NAV: NavItem[] = [
  {
    href: "/sell/dashboard",
    label: "แดชบอร์ด",
    icon: <Icon d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />,
  },
  {
    href: "/sell/bookings",
    label: "การจอง",
    icon: <Icon d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  },
];

const PRODUCTS_NAV: NavItem[] = [
  {
    href: "/sell/products",
    label: "สินค้า",
    icon: <Icon d="M4 6h16M4 10h16M4 14h16M4 18h10" />,
  },
];

const OWNER_NAV: NavItem[] = [
  {
    href: "/sell/edit",
    label: "แก้ไขร้าน",
    icon: <Icon d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />,
  },
  {
    href: "/sell/tags",
    label: "ขอเพิ่มแท็ก",
    icon: <Icon d="M7 7h10M7 12h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM16 17l2 2 4-4" />,
  },
  {
    href: "/sell/staff",
    label: "พนักงานร้าน",
    icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  },
];

/* ── Props ── */
export type SellSidebarProps = {
  /** Staff mode (limited nav) */
  isStaff?: boolean;
  canManageBookings?: boolean;
  canManageProducts?: boolean;
  /** Shop info for the sidebar chip */
  shop?: {
    name: string;
    verified: boolean;
    isOpen: boolean;
    id: string;
  };
  /** Booking badge count */
  bookingBadge?: number;
  /** Marketplace-back link label (from GPT consultation) */
  backLabel?: string;
};

export default function SellSidebar({
  isStaff = false,
  canManageBookings = true,
  canManageProducts = false,
  shop,
  bookingBadge = 0,
  backLabel = "สำรวจ DopRent",
}: SellSidebarProps) {
  const pathname = usePathname();

  // Build nav items
  let nav: NavItem[];
  if (isStaff) {
    nav = [
      ...BASE_NAV.filter((item) => {
        if (item.href === "/sell/bookings") return canManageBookings;
        return true;
      }),
    ];
    if (canManageProducts) nav.push(...PRODUCTS_NAV);
  } else {
    nav = [...BASE_NAV, ...PRODUCTS_NAV, ...OWNER_NAV];
  }

  // Add badge to bookings
  if (bookingBadge > 0) {
    nav = nav.map((item) =>
      item.href === "/sell/bookings" ? { ...item, badge: bookingBadge } : item,
    );
  }

  return (
    <aside className="seller-side">
      {/* ── Brand ── */}
      <div className="seller-brand">
        <div className="seller-brand-logo">D</div>
        <div>
          <b>DopRent</b>
          <small>แดชบอร์ดร้าน</small>
        </div>
      </div>

      {/* ── Shop chip ── */}
      {shop && (
        <>
          <div className="seller-shop-chip">
            <div className="av" />
            <div>
              <div className="nm">{shop.name}</div>
              {shop.verified && (
                <div className="vf">✓ ยืนยันตัวตนแล้ว</div>
              )}
            </div>
          </div>

          {/* ── Open/close pill ── */}
          <div className={`seller-open-pill${shop.isOpen ? "" : " is-closed"}`}>
            <span className="led" />
            <span style={{ flex: 1 }}>
              {shop.isOpen ? "ร้านเปิดอยู่" : "ปิดร้านชั่วคราว"}
            </span>
            <form action={toggleShopOpen.bind(null, shop.id)} style={{ display: "inline-flex" }}>
              <ToggleSwitch
                checked={shop.isOpen}
                label={shop.isOpen ? "ปิดร้าน" : "เปิดร้าน"}
              />
            </form>
          </div>
        </>
      )}

      {/* ── Navigation ── */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map((item) => {
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
              {item.badge ? (
                <span className="badge">{item.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* ── Spacer pushes back-link to bottom ── */}
      <div className="seller-nav-spacer" />

      {/* ── Back to marketplace ── */}
      <Link href="/" className="seller-nav-back">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
        {backLabel}
      </Link>

      {/* ── Logout ── */}
      <form action="/auth/signout" method="POST" style={{ padding: "0 8px 4px" }}>
        <button
          type="submit"
          className="seller-nav-back"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", font: "inherit" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          ออกจากระบบ
        </button>
      </form>

      {isStaff && (
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ink-3)",
            padding: "8px 11px 0",
            borderTop: "1px solid var(--line-2)",
            marginTop: 8,
          }}
        >
          เข้าสู่ระบบในฐานะพนักงาน
        </div>
      )}
    </aside>
  );
}
