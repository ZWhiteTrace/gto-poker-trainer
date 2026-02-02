import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 模擬考 - 綜合德撲知識測驗",
  description:
    "用計時測驗檢驗你的 GTO 知識。涵蓋 GTO 理論、手牌勝率、位置策略、Push/Fold 決策等綜合內容。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
