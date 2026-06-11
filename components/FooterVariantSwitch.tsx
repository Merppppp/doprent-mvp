"use client";

import { usePathname } from "next/navigation";

/**
 * Route-aware footer switch.
 *
 * The three variants are fully rendered on the server (so i18n via
 * getServerLocale keeps working) and passed in as slots. usePathname is
 * resolved during SSR for client components, so the correct variant is
 * already in the server HTML — no hydration mismatch, no layout flash.
 */
export default function FooterVariantSwitch({
  defaultFooter,
  sellerFooter,
  adminFooter,
}: {
  defaultFooter: React.ReactNode;
  sellerFooter: React.ReactNode;
  adminFooter: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith("/admin")) return <>{adminFooter}</>;
  if (pathname.startsWith("/sell/dashboard")) return <>{sellerFooter}</>;
  return <>{defaultFooter}</>;
}
