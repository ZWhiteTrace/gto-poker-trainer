import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { AchievementToast } from "@/components/AchievementToast";
import { OfflineIndicator } from "@/components/providers/OfflineIndicator";

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
    default: "免費德州撲克 GTO 練習工具 - 在線撲克範圍訓練器",
    template: "%s | GTO 撲克訓練器",
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
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  description:
    "提升德撲技巧的免費 GTO 訓練器。提供翻前範圍表 (Preflop Ranges)、推圖 (Push/Fold) 練習及 ICM 計算。無需下載註冊，立即開啟在線練習。",
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
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://grindgto.com",
    siteName: "GTO 撲克訓練器",
    title: "免費德州撲克 GTO 練習工具 - 在線撲克範圍訓練器",
    description: "提升德撲技巧的免費 GTO 訓練器。提供翻前範圍表 (Preflop Ranges)、推圖 (Push/Fold) 練習及 ICM 計算。無需下載註冊，立即開啟在線練習。",
    images: [
      {
        url: "https://grindgto.com/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GTO 撲克訓練器 - 免費德州撲克 GTO 練習工具",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "免費德州撲克 GTO 練習工具 - 在線撲克範圍訓練器",
    description: "提升德撲技巧的免費 GTO 訓練器。提供翻前範圍表 (Preflop Ranges)、推圖 (Push/Fold) 練習及 ICM 計算。無需下載註冊，立即開啟在線練習。",
    images: ["https://grindgto.com/opengraph-image"],
  },
  alternates: {
    canonical: "https://grindgto.com",
  },
  verification: {
    google: "qpFj8lm0xp4HSdFNKqKKNshhirIaQeKa-Sgd9zzsHis",
  },
};

function StructuredDataJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://grindgto.com/#website",
        name: "GTO 撲克訓練器 - 免費德州撲克練習工具",
        url: "https://grindgto.com",
        description:
          "提升德撲技巧的免費 GTO 訓練器。提供翻前範圍表、推圖練習及 ICM 計算。",
        inLanguage: ["zh-TW", "zh-CN"],
        publisher: { "@id": "https://grindgto.com/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: "https://grindgto.com/learn?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://grindgto.com/#organization",
        name: "GTO 撲克訓練器",
        url: "https://grindgto.com",
        logo: {
          "@type": "ImageObject",
          url: "https://grindgto.com/icon-512.png",
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://grindgto.com/#app",
        name: "GTO 撲克訓練器",
        applicationCategory: "GameApplication",
        operatingSystem: "Web Browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "免費 GTO 德州撲克訓練應用，提供翻前範圍練習、推圖表和 AI 手牌分析",
        featureList: [
          "翻前範圍訓練",
          "推圖 (Push/Fold) 練習",
          "ICM 計算器",
          "AI 手牌分析",
          "學習進度追蹤",
        ],
        author: { "@id": "https://grindgto.com/#organization" },
      },
      {
        "@type": "Course",
        "@id": "https://grindgto.com/#course",
        name: "GTO 撲克策略訓練",
        description: "透過互動練習和範圍表掌握 GTO 最優撲克策略",
        provider: { "@id": "https://grindgto.com/#organization" },
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
        teaches: [
          "各位置的翻前範圍",
          "3-bet 和 4-bet 策略",
          "錦標賽推圖策略",
          "ICM 考量",
        ],
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
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <StructuredDataJsonLd />
        {/* Apple splash screens for PWA */}
        <link rel="apple-touch-startup-image" href="/api/splash?w=1290&h=2796" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1179&h=2556" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1284&h=2778" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1170&h=2532" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1125&h=2436" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1242&h=2688" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=828&h=1792" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1242&h=2208" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=750&h=1334" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=640&h=1136" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1320&h=2868" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/api/splash?w=1206&h=2622" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <OfflineIndicator />
            <div className="relative flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <ServiceWorkerProvider />
            <AchievementToast />
          </AuthProvider>
        </NextIntlClientProvider>
        <GoogleAnalytics gaId="G-6M17SD2FQR" />
      </body>
    </html>
  );
}
