import type { MetadataRoute } from "next";
import { listBoutiques, listDresses } from "@/lib/dresses";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doprent.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ items: dresses }, boutiques] = await Promise.all([listDresses({ limit: 1000 }), listBoutiques()]);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/boutiques`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const dressPages: MetadataRoute.Sitemap = dresses.map((d) => ({
    url: `${SITE}/dress/${d.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const boutiquePages: MetadataRoute.Sitemap = boutiques.map((b) => ({
    url: `${SITE}/boutique/${b.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...dressPages, ...boutiquePages];
}
