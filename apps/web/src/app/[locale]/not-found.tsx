import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, Target, BarChart3 } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) === "en" ? "en" : "zh-TW";

  return {
    title:
      locale === "en"
        ? "404 - Page Not Found | GTO Poker Trainer"
        : "404 - 找不到頁面 | GTO 撲克訓練器",
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: "./",
    },
  };
}

export default async function NotFound() {
  const locale = (await getLocale()) === "en" ? "en" : "zh-TW";
  const copy =
    locale === "en"
      ? {
          title: "Page Not Found",
          description: "The page you are looking for doesn't exist or has moved. Try one of these routes instead:",
          home: "Home",
          drill: "RFI Drill",
          learn: "Learning Center",
          range: "Range Viewer",
        }
      : {
          title: "找不到頁面",
          description: "你要找的頁面不存在或已被移動。試試以下連結繼續訓練：",
          home: "首頁",
          drill: "RFI 練習",
          learn: "學習中心",
          range: "範圍表",
        };

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-muted-foreground mb-4 text-6xl font-bold">404</h1>
      <h2 className="mb-2 text-2xl font-semibold">{copy.title}</h2>
      <p className="text-muted-foreground mb-8 max-w-md">{copy.description}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button variant="default" className="gap-2">
            <Home className="h-4 w-4" />
            {copy.home}
          </Button>
        </Link>
        <Link href="/drill/rfi">
          <Button variant="outline" className="gap-2">
            <Target className="h-4 w-4" />
            {copy.drill}
          </Button>
        </Link>
        <Link href="/learn">
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {copy.learn}
          </Button>
        </Link>
        <Link href="/range">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {copy.range}
          </Button>
        </Link>
      </div>
    </div>
  );
}
