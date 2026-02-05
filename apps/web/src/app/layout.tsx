import type { Metadata } from "next";
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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

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

function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GTO 撲克訓練器 - 免費德州撲克練習工具",
    url: "https://grindgto.com",
    description: "提升德撲技巧的免費 GTO 訓練器。提供翻前範圍表、推圖練習及 ICM 計算。",
    inLanguage: ["zh-TW", "zh-CN"],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://grindgto.com/learn?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GTO 撲克訓練器",
    url: "https://grindgto.com",
    logo: "https://grindgto.com/icon-512.png",
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function SoftwareApplicationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GTO 撲克訓練器",
    applicationCategory: "GameApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
      bestRating: "5",
      worstRating: "1",
    },
    description: "免費 GTO 德州撲克訓練應用，提供翻前範圍練習、推圖表和 AI 手牌分析",
    featureList: [
      "翻前範圍訓練",
      "推圖 (Push/Fold) 練習",
      "ICM 計算器",
      "AI 手牌分析",
      "學習進度追蹤",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function CourseJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "GTO 撲克策略訓練",
    description: "透過互動練習和範圍表掌握 GTO 最優撲克策略",
    provider: {
      "@type": "Organization",
      name: "GTO 撲克訓練器",
      url: "https://grindgto.com",
    },
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
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        <SoftwareApplicationJsonLd />
        <CourseJsonLd />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
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
