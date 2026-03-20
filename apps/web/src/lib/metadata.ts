import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

export type AppLocale = (typeof routing.locales)[number];

export const BASE_URL = "https://grindgto.com";

const OG_LOCALE_MAP: Record<AppLocale, string> = {
  "zh-TW": "zh_TW",
  en: "en_US",
};

const SITE_NAME_MAP: Record<AppLocale, string> = {
  "zh-TW": "GTO 撲克訓練器",
  en: "GTO Poker Trainer",
};

function normalizePath(path: string) {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function toAppLocale(locale: string): AppLocale {
  return locale === "en" ? "en" : "zh-TW";
}

export function getLocalizedUrl(locale: AppLocale, path = "") {
  const normalizedPath = normalizePath(path);

  if (locale === routing.defaultLocale) {
    return normalizedPath ? `${BASE_URL}${normalizedPath}` : BASE_URL;
  }

  return normalizedPath ? `${BASE_URL}/${locale}${normalizedPath}` : `${BASE_URL}/${locale}`;
}

export function createAlternates(locale: AppLocale, path = ""): Metadata["alternates"] {
  return {
    canonical: getLocalizedUrl(locale, path),
    languages: {
      "zh-TW": getLocalizedUrl("zh-TW", path),
      en: getLocalizedUrl("en", path),
      "x-default": getLocalizedUrl(routing.defaultLocale, path),
    },
  };
}

type PageMetadataInput = {
  locale: string;
  path?: string;
  title: string;
  description: string;
  type?: "website" | "article";
};

export function createPageMetadata({
  locale,
  path = "",
  title,
  description,
  type = "website",
}: PageMetadataInput): Metadata {
  const appLocale = toAppLocale(locale);
  const url = getLocalizedUrl(appLocale, path);

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: createAlternates(appLocale, path),
    openGraph: {
      type,
      locale: OG_LOCALE_MAP[appLocale],
      url,
      siteName: SITE_NAME_MAP[appLocale],
      title,
      description,
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/opengraph-image`],
    },
  };
}
