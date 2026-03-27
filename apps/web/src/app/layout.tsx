import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import { GoogleAnalytics } from "@next/third-parties/google";
import { BASE_URL, type AppLocale, getLocalizedUrl, toAppLocale } from "@/lib/metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://grindgto.com"),
  title: {
    default: "GTO Poker Trainer",
    template: "%s | GTO Poker Trainer",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GTO Trainer",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  description: "Free GTO poker training tools for preflop drills, quizzes, and range study.",
  keywords: [
    "GTO poker",
    "poker trainer",
    "preflop range",
    "push fold chart",
    "poker strategy",
    "德州撲克",
    "GTO訓練",
    "撲克訓練器",
    "翻前範圍",
    "推圖",
    "ICM計算",
    "免費撲克工具",
    "德撲技巧",
    "撲克訓練",
    "GTO 策略",
  ],
  verification: {
    google: "qpFj8lm0xp4HSdFNKqKKNshhirIaQeKa-Sgd9zzsHis",
  },
};

function StructuredDataJsonLd({ locale }: { locale: AppLocale }) {
  const siteCopy =
    locale === "en"
      ? {
          name: "GTO Poker Trainer - Free Online Poker Training Tools",
          description:
            "Free GTO poker trainer for preflop ranges, push-fold practice, ICM tools, and hand analysis.",
          organizationName: "GTO Poker Trainer",
          appName: "GTO Poker Trainer",
          appDescription:
            "Free GTO poker training app for preflop drills, push-fold charts, and AI hand analysis",
          featureList: [
            "Preflop range drills",
            "Push/Fold practice",
            "ICM calculator",
            "AI hand analysis",
            "Progress tracking",
          ],
          courseName: "GTO Poker Strategy Training",
          courseDescription:
            "Learn game theory optimal poker strategy through interactive drills and range-based practice",
          teaches: [
            "Preflop opening ranges by position",
            "3-bet and 4-bet strategy",
            "Tournament push-fold spots",
            "ICM decision making",
          ],
          searchTarget: `${getLocalizedUrl(locale, "/learn")}?q={search_term_string}`,
        }
      : {
          name: "GTO 撲克訓練器 - 免費德州撲克練習工具",
          description: "提升德撲技巧的免費 GTO 訓練器。提供翻前範圍表、推圖練習及 ICM 計算。",
          organizationName: "GTO 撲克訓練器",
          appName: "GTO 撲克訓練器",
          appDescription: "免費 GTO 德州撲克訓練應用，提供翻前範圍練習、推圖表和 AI 手牌分析",
          featureList: [
            "翻前範圍訓練",
            "推圖 (Push/Fold) 練習",
            "ICM 計算器",
            "AI 手牌分析",
            "學習進度追蹤",
          ],
          courseName: "GTO 撲克策略訓練",
          courseDescription: "透過互動練習和範圍表掌握 GTO 最優撲克策略",
          teaches: ["各位置的翻前範圍", "3-bet 和 4-bet 策略", "錦標賽推圖策略", "ICM 考量"],
          searchTarget: `${BASE_URL}/learn?q={search_term_string}`,
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        name: siteCopy.name,
        url: BASE_URL,
        description: siteCopy.description,
        inLanguage: ["zh-TW", "en"],
        publisher: { "@id": `${BASE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: siteCopy.searchTarget,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: siteCopy.organizationName,
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/icon-512.png`,
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${BASE_URL}/#app`,
        name: siteCopy.appName,
        applicationCategory: "GameApplication",
        operatingSystem: "Web Browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description: siteCopy.appDescription,
        featureList: siteCopy.featureList,
        author: { "@id": `${BASE_URL}/#organization` },
      },
      {
        "@type": "Course",
        "@id": `${BASE_URL}/#course`,
        name: siteCopy.courseName,
        description: siteCopy.courseDescription,
        provider: { "@id": `${BASE_URL}/#organization` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        hasCourseInstance: [
          {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: "PT30M",
          },
        ],
        teaches: siteCopy.teaches,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const appLocale = toAppLocale(locale);

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <StructuredDataJsonLd locale={appLocale} />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1290&h=2796"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1179&h=2556"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1284&h=2778"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1170&h=2532"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1125&h=2436"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1242&h=2688"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=828&h=1792"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1242&h=2208"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=750&h=1334"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=640&h=1136"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1320&h=2868"
          media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/api/splash?w=1206&h=2622"
          media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
