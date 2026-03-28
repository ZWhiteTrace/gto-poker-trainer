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
    path: "/plo",
    title: locale === "en" ? "PLO4 Fundamentals - Omaha Learning Tools" : "PLO4 基礎訓練 - 奧馬哈學習工具",
    description:
      locale === "en"
        ? "Learn core Pot-Limit Omaha rules and practice hand-reading drills built around the must-use-2 rule."
        : "學習 PLO4 奧馬哈核心規則，並用必須使用 2 張手牌的題型練習牌型判讀。",
  });
}

export default async function PLOLayout({ children }: Props) {
  return children;
}
