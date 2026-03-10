import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Outs 計算測驗 - 聽牌出路練習",
  description: "練習計算翻後聽牌的 Outs 數量。同花聽牌、順子聽牌、組合聽牌，快速判斷改進概率。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
