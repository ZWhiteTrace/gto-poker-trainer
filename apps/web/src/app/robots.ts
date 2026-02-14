import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        // User-specific pages (require login or personal data)
        "/progress",
        "/profile",
        "/stats",
        "/achievements",
      ],
    },
    sitemap: "https://grindgto.com/sitemap.xml",
  };
}
