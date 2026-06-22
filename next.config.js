/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  transpilePackages: ["swiper"],
  images: {
    remotePatterns: [
{ protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" }
    ]
  },
  async redirects() {
    // Old public URLs (pre db-restructure vocabulary) → new routes.
    return [
      { source: "/dress/:id/edit", destination: "/product/:id/edit", permanent: true },
      { source: "/dress/:id", destination: "/product/:id", permanent: true },
      { source: "/boutique/:slug", destination: "/shop/:slug", permanent: true },
      { source: "/boutiques", destination: "/shops", permanent: true },
    ];
  }
};

module.exports = nextConfig;
