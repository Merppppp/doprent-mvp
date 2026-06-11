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
    href: "/sell/dresses/new",
    label: "เพิ่มชุด",
    match: "/sell/dresses",
    icon: <Icon d="M12 5v14M5 12h14" />,
  },
  {
    href: "/sell/bookings",
    label: "การจอง",
    icon: <Icon d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
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
];

export default function SellSidebar() {
  return <DashNav badge="ร้านค้า" title="Seller" items={NAV} />;
}
