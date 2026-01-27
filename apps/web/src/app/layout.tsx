import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GTO Poker Trainer - Master Poker Strategy",
    template: "%s | GTO Poker Trainer",
  },
  description:
    "Free GTO poker trainer: preflop range charts, push/fold strategy, ICM calculator. Master game theory optimal poker strategy.",
  keywords: [
    "GTO poker",
    "poker trainer",
    "preflop range",
    "push fold chart",
    "poker strategy",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "GTO Poker Trainer",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
