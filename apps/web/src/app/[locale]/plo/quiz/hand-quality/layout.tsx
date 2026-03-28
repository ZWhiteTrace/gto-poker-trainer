import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return createPageMetadata({
    locale,
    path: "/plo/quiz/hand-quality",
    title: locale === "en" ? "PLO4 Hand Quality Quiz" : "PLO4 起手牌品質測驗",
    description:
      locale === "en"
        ? "Compare Omaha starting-hand structures and learn why double-suited rundowns outperform disconnected trash."
        : "比較 PLO4 奧馬哈起手牌結構，理解為什麼雙花順子牌通常優於斷張垃圾牌。",
  });
}

export default async function HandQualityLayout({ children }: Props) {
  return children;
}
