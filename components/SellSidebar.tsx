"use client";

import DashNav, { type DashNavItem } from "@/components/DashNav";

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

const BASE_NAV: DashNavItem[] = [
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

const PRODUCTS_NAV: DashNavItem[] = [
  {
    href: "/sell/products",
    label: "สินค้า",
    icon: <Icon d="M4 6h16M4 10h16M4 14h16M4 18h10" />,
  },
];

const OWNER_NAV: DashNavItem[] = [
  {
    href: "/sell/calendar",
    label: "ปฏิทินร้าน",
    icon: <Icon d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />,
  },
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

export default function SellSidebar({
  isStaff = false,
  canManageBookings = true,
  canManageProducts = false,
}: {
  isStaff?: boolean;
  canManageBookings?: boolean;
  canManageProducts?: boolean;
}) {
  let nav: DashNavItem[];

  if (isStaff) {
    nav = [...BASE_NAV.filter((item) => {
      if (item.href === "/sell/bookings") return canManageBookings;
      return true;
    })];
    if (canManageProducts) nav.push(...PRODUCTS_NAV);
  } else {
    nav = [...BASE_NAV, ...PRODUCTS_NAV, ...OWNER_NAV];
  }

  return <DashNav badge={isStaff ? "พนักงาน" : "ร้านค้า"} title={isStaff ? "Staff" : "Seller"} items={nav} />;
}
