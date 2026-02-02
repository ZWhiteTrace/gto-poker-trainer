import { Metadata } from "next";

export const metadata: Metadata = {
  title: "牌面結構分析練習 - Flop Texture 識別訓練",
  description:
    "學習識別不同的翻牌面結構（乾燥、濕潤、配對等），理解牌面結構如何影響你的策略選擇。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
