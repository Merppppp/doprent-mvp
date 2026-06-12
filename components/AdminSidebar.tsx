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
    href: "/admin/bookings",
    label: "การจอง",
    icon: <Icon d="M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
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
    href: "/admin/clicks",
    label: "LINE Clicks",
    icon: <Icon d="M4 12a8 8 0 1116 0 8 8 0 01-16 0zM12 8v4l3 2" />,
  },
];

export default function AdminSidebar() {
  return <DashNav badge="Admin" title="Console" items={NAV} />;
}
