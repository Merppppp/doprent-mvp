"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DashNavItem = {
  href: string;
  label: string;
  /** Match only when pathname === href (default: prefix match) */
  exact?: boolean;
  /** Optional extra prefix that also counts as active (e.g. "/sell/dresses") */
  match?: string;
  icon?: React.ReactNode;
};

function isActive(pathname: string, item: DashNavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  if (item.match) {
    return pathname === item.match || pathname.startsWith(`${item.match}/`);
  }
  return false;
}

export default function DashNav({
  badge,
  title,
  items,
}: {
  badge?: string;
  title?: string;
  items: DashNavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav className="dash-nav" aria-label={title ?? badge ?? "menu"}>
      {(badge || title) && (
        <div className="dash-nav-head">
          {badge && <span className="dash-nav-badge">{badge}</span>}
          {title && <span className="dash-nav-title">{title}</span>}
        </div>
      )}
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`dash-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
