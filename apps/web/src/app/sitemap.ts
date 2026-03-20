import { MetadataRoute } from "next";
import { getAllGuides } from "@/lib/guides";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://grindgto.com";

function alternates(path: string, locales: readonly string[] = routing.locales) {
  return {
    languages: Object.fromEntries(
      locales.map((locale) => [
        locale,
        locale === routing.defaultLocale ? `${BASE_URL}${path}` : `${BASE_URL}/${locale}${path}`,
      ])
    ),
  };
}

function entry(
  path: string,
  opts: { changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number },
  locales: readonly string[] = routing.locales
): MetadataRoute.Sitemap[0] {
  return {
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: alternates(path, locales),
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const guides = getAllGuides();
  const translatedEnglishGuideSlugs = new Set(
    getAllGuides("en")
      .filter((guide) => guide.contentLocale === "en")
      .map((guide) => guide.slug)
  );

  const contentPages: MetadataRoute.Sitemap = [
    entry("", { changeFrequency: "weekly", priority: 1 }),
    entry("/learn", { changeFrequency: "weekly", priority: 0.9 }),
    entry("/drill/rfi", { changeFrequency: "monthly", priority: 0.9 }),
    entry("/drill/vs-rfi", { changeFrequency: "monthly", priority: 0.9 }),
    entry("/drill/vs-3bet", { changeFrequency: "monthly", priority: 0.8 }),
    entry("/drill/vs-4bet", { changeFrequency: "monthly", priority: 0.8 }),
    entry("/drill/push-fold", { changeFrequency: "monthly", priority: 0.9 }),
    entry("/mtt/push-fold", { changeFrequency: "monthly", priority: 0.8 }),
    entry("/mtt/icm", { changeFrequency: "monthly", priority: 0.8 }),
    entry("/range", { changeFrequency: "monthly", priority: 0.8 }),
    entry("/quiz", { changeFrequency: "monthly", priority: 0.8 }),
    entry("/exam", { changeFrequency: "monthly", priority: 0.8 }),
    entry("/privacy", { changeFrequency: "yearly", priority: 0.3 }),
    entry("/terms", { changeFrequency: "yearly", priority: 0.3 }),
  ];

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) =>
    entry(
      `/learn/${guide.slug}`,
      { changeFrequency: "monthly", priority: 0.8 },
      translatedEnglishGuideSlugs.has(guide.slug) ? routing.locales : [routing.defaultLocale]
    )
  );

  return [...contentPages, ...guidePages];
}
