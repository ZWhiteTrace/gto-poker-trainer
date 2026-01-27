import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GTO Poker Trainer - Master Poker Strategy",
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
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  description:
    "Free GTO poker trainer: preflop range charts, push/fold strategy, ICM calculator. Master game theory optimal poker strategy.",
  keywords: [
    "GTO poker",
    "poker trainer",
    "preflop range",
    "push fold chart",
    "poker strategy",
    "poker GTO",
    "撲克訓練",
    "翻前範圍",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gto-trainer.com",
    siteName: "GTO Poker Trainer",
    title: "GTO Poker Trainer - Master Poker Strategy",
    description: "Free GTO poker trainer: preflop range charts, push/fold strategy, ICM calculator.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GTO Poker Trainer",
    description: "Free GTO poker trainer: preflop range charts, push/fold strategy, ICM calculator.",
  },
  alternates: {
    canonical: "https://gto-trainer.com",
  },
  verification: {
    google: "your-google-verification-code", // Replace with actual code
  },
};

function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GTO Poker Trainer",
    url: "https://gto-trainer.com",
    description: "Free GTO poker trainer for mastering preflop ranges and poker strategy",
    inLanguage: ["en", "zh-TW"],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://gto-trainer.com/learn?q={search_term_string}",
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
    name: "GTO Poker Trainer",
    url: "https://gto-trainer.com",
    logo: "https://gto-trainer.com/icon-512.png",
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
    name: "GTO Poker Trainer",
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
    description: "Free GTO poker training app with preflop range drills, push/fold charts, and AI hand analysis",
    featureList: [
      "Preflop Range Training",
      "Push/Fold Charts",
      "ICM Calculator",
      "AI Hand Analysis",
      "Progress Tracking",
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
    name: "GTO Poker Strategy Training",
    description: "Master game theory optimal poker strategy with interactive drills and range charts",
    provider: {
      "@type": "Organization",
      name: "GTO Poker Trainer",
      url: "https://gto-trainer.com",
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
      "Preflop ranges for all positions",
      "3-bet and 4-bet strategy",
      "Push/fold tournament strategy",
      "ICM considerations",
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
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
