import { MetadataRoute } from "next";
import { getAllGuides } from "@/lib/guides";

const BASE_URL = "https://grindgto.com";

/**
 * Optimized sitemap for SEO
 * - Focus on content-rich pages (learn, guides)
 * - Include main tool entry points only
 * - Exclude user-specific pages (profile, stats, achievements)
 * - Exclude pages blocked by robots.txt
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const guides = getAllGuides();

  // High-priority content pages
  const contentPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/learn`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Main tool landing pages (entry points only)
    {
      url: `${BASE_URL}/range`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/quiz`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/exam`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Legal (required pages)
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic guide pages (high SEO value - actual content)
  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${BASE_URL}/learn/${guide.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...contentPages, ...guidePages];
}
