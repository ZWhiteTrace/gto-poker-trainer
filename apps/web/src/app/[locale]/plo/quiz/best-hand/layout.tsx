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
    path: "/plo/quiz/best-hand",
    title: locale === "en" ? "PLO4 Best Hand Quiz" : "PLO4 最佳牌型測驗",
    description:
      locale === "en"
        ? "Test your PLO4 hand reading skills. Given 4 hole cards and a board, find the best hand using exactly 2 hole cards and 3 board cards."
        : "練習 PLO4 奧馬哈牌型判讀。給你 4 張手牌和公牌，找出必須使用 2 張手牌 + 3 張公牌的最佳牌型。",
  });
}

export default async function BestHandLayout({ children }: Props) {
  return children;
}
