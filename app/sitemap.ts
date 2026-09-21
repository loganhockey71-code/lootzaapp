import type { MetadataRoute } from "next";
import { categories } from "@/lib/data/categories";
import { getAllPostSlugs } from "@/lib/blog";

const BASE_URL = "https://lootza.vercel.app";

/**
 * Static/known-at-build-time URLs only — real (Supabase) listings aren't
 * enumerable here without a live fetch at build time, which would make every
 * deploy depend on Supabase being reachable. Categories and blog posts alone
 * still give search engines a real crawl path into the site's structure.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/discover`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/refund-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/categories/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = getAllPostSlugs().map((slug) => ({
    url: `${BASE_URL}/blog/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...blogPages];
}
