import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "DopRent — เช่าชุดดีไซเนอร์ในกรุงเทพฯ",
    template: "%s · DopRent",
  },
  description:
    "DopRent — แคตตาล็อกชุดเช่าจากร้านในกรุงเทพฯ ติดต่อจองผ่าน LINE โดยตรงกับร้าน",
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
    title: "DopRent — เช่าชุดดีไซเนอร์ในกรุงเทพฯ",
    description:
      "แคตตาล็อกชุดเช่าจากร้านในกรุงเทพฯ ติดต่อจองผ่าน LINE โดยตรงกับร้าน",
    url: SITE,
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: "DopRent — เช่าชุดดีไซเนอร์ในกรุงเทพฯ",
    description:
      "แคตตาล็อกชุดเช่าจากร้านในกรุงเทพฯ ติดต่อจองผ่าน LINE โดยตรงกับร้าน",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFAFA",
};

// Force dynamic rendering so the auth-aware Header always reads the latest cookie state.
// (Per-page revalidate caching makes Header render with stale auth state.)
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
