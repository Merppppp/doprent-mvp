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

const NAV: DashNavItem[] = [
  {
    href: "/sell/dashboard",
    label: "แดชบอร์ด",
    icon: <Icon d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />,
  },
  {
    href: "/sell/products/new",
    label: "เพิ่มสินค้า",
    match: "/sell/products",
    icon: <Icon d="M12 5v14M5 12h14" />,
  },
  {
    href: "/sell/bookings",
    label: "การจอง",
    icon: <Icon d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  },
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
    href: "/sell/upgrade",
    label: "อัปเกรด",
    icon: <Icon d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" />,
  },
  {
    href: "/sell/banners",
    label: "แบนเนอร์ร้าน",
    icon: <Icon d="M4 5h16a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM8 17h8M10 17v2M14 17v2" />,
  },
  {
    href: "/sell/tags",
    label: "ขอเพิ่มแท็ก",
    icon: <Icon d="M7 7h10M7 12h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM16 17l2 2 4-4" />,
  },
];

export default function SellSidebar() {
  return <DashNav badge="ร้านค้า" title="Seller" items={NAV} />;
}
