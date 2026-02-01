import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/progress"],
    },
    sitemap: "https://gto-poker-trainer-six.vercel.app/sitemap.xml",
  };
}
