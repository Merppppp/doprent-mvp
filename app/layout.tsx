import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import RouteProgress from "@/components/RouteProgress";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import PageViewTracker from "@/components/PageViewTracker";
import ClarityAnalytics from "@/components/ClarityAnalytics";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import LocationProvider from "@/components/LocationProvider";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

// Default OG image for pages without their own (home, browse, etc.). Product &
// shop pages override openGraph.images with their own item/shop photo. Served
// from object storage (MinIO dev / R2 prod) via the public asset base URL.
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";
const OG_DEFAULT = ASSET_BASE ? `${ASSET_BASE}/banners/banner-1.png` : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "DopRent · เช่าชุดดีไซเนอร์ในกรุงเทพฯ",
    template: "%s · DopRent",
  },
  description:
    "DopRent · แคตตาล็อกชุดเช่าจากร้านในกรุงเทพฯ ติดต่อจองผ่าน LINE โดยตรงกับร้าน",
  keywords: [
    "เช่าชุด",
    "ชุดเช่ากรุงเทพ",
    "ชุดราตรี",
    "Bangkok dress rental",
    "boutique rental",
    "DopRent",
  ],
  alternates: { canonical: SITE },
  openGraph: {
    type: "website",
    siteName: "DopRent",
    title: "DopRent · เช่าชุดดีไซเนอร์ในกรุงเทพฯ",
    description:
      "แคตตาล็อกชุดเช่าจากร้านในกรุงเทพฯ ติดต่อจองผ่าน LINE โดยตรงกับร้าน",
    url: SITE,
    locale: "th_TH",
    images: OG_DEFAULT ? [{ url: OG_DEFAULT, alt: "DopRent" }] : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: "DopRent · เช่าชุดดีไซเนอร์ในกรุงเทพฯ",
    description:
      "แคตตาล็อกชุดเช่าจากร้านในกรุงเทพฯ ติดต่อจองผ่าน LINE โดยตรงกับร้าน",
    images: OG_DEFAULT ? [OG_DEFAULT] : undefined,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F3E8",
};

// NOTE: force-dynamic was previously set here to ensure the auth-aware Header
// always reads the current cookie state. It has been removed because any route
// that renders the Header already becomes dynamic automatically (Header is a
// Server Component that calls auth() / getCurrentUser(), both of which read
// cookies — Next.js opts those routes into dynamic rendering without a global
// override). Keeping it caused ALL routes (including fully-static pages) to
// skip the cache unnecessarily.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600&family=Bai+Jamjuree:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600&family=IBM+Plex+Serif+Thai:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ overflow: "hidden", height: "100vh", display: "flex", flexDirection: "column" }}>
        <a
          href="#main"
          style={{
            position: "absolute",
            left: -9999,
            top: 0,
          }}
        >
          ข้ามไปยังเนื้อหา
        </a>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <LocationProvider>
          <Header />
          <div id="main" style={{ flex: 1, overflowY: "auto" }}>
            <main>{children}</main>
            <Footer />
          </div>
          <ScrollReveal />
          <PageViewTracker />
          <ClarityAnalytics />
          <GoogleAnalytics />
        </LocationProvider>
      </body>
    </html>
  );
}
