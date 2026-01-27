import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const locales = ["zh-TW", "en"] as const;
export const defaultLocale = "zh-TW" as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;

  // Then try Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language") || "";

  // Determine locale
  let locale: Locale = defaultLocale;

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    locale = localeCookie as Locale;
  } else if (acceptLanguage.includes("en")) {
    locale = "en";
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
