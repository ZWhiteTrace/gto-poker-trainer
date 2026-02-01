import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { AchievementToast } from "@/components/AchievementToast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "免费德州扑克 GTO 练习工具 - 在线扑克范围训练器",
    template: "%s | GTO 扑克训练器",
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
    "提升德扑技巧的免费 GTO 训练器。提供翻前范围表 (Preflop Ranges)、推图 (Push/Fold) 练习及 ICM 计算。无需下载注册，立即开启在线练习。",
  keywords: [
    "GTO poker",
    "poker trainer",
    "preflop range",
    "push fold chart",
    "poker strategy",
    "poker GTO",
    "德州扑克",
    "GTO训练",
    "扑克训练器",
    "翻前范围",
    "推图",
    "ICM计算",
    "免费扑克工具",
    "德扑技巧",
    "撲克訓練",
    "翻前範圍",
  ],
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://gto-poker-trainer-six.vercel.app",
    siteName: "GTO 扑克训练器",
    title: "免费德州扑克 GTO 练习工具 - 在线扑克范围训练器",
    description: "提升德扑技巧的免费 GTO 训练器。提供翻前范围表 (Preflop Ranges)、推图 (Push/Fold) 练习及 ICM 计算。无需下载注册，立即开启在线练习。",
  },
  twitter: {
    card: "summary_large_image",
    title: "免费德州扑克 GTO 练习工具 - 在线扑克范围训练器",
    description: "提升德扑技巧的免费 GTO 训练器。提供翻前范围表 (Preflop Ranges)、推图 (Push/Fold) 练习及 ICM 计算。无需下载注册，立即开启在线练习。",
  },
  alternates: {
    canonical: "https://gto-poker-trainer-six.vercel.app",
  },
  verification: {
    google: "qpFj8lm0xp4HSdFNKqKKNshhirIaQeKa-Sgd9zzsHis",
  },
};

function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GTO 扑克训练器 - 免费德州扑克练习工具",
    url: "https://gto-poker-trainer-six.vercel.app",
    description: "提升德扑技巧的免费 GTO 训练器。提供翻前范围表、推图练习及 ICM 计算。",
    inLanguage: ["zh-TW", "zh-CN"],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://gto-poker-trainer-six.vercel.app/learn?q={search_term_string}",
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
    name: "GTO 扑克训练器",
    url: "https://gto-poker-trainer-six.vercel.app",
    logo: "https://gto-poker-trainer-six.vercel.app/icon-512.png",
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
    name: "GTO 扑克训练器",
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
    description: "免费 GTO 德州扑克训练应用，提供翻前范围练习、推图表和 AI 手牌分析",
    featureList: [
      "翻前范围训练",
      "推图 (Push/Fold) 练习",
      "ICM 计算器",
      "AI 手牌分析",
      "学习进度追踪",
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
    name: "GTO 扑克策略训练",
    description: "通过互动练习和范围表掌握 GTO 最优扑克策略",
    provider: {
      "@type": "Organization",
      name: "GTO 扑克训练器",
      url: "https://gto-poker-trainer-six.vercel.app",
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
      "各位置的翻前范围",
      "3-bet 和 4-bet 策略",
      "锦标赛推图策略",
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
      </body>
    </html>
  );
}
