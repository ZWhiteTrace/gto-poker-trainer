import { Metadata } from "next";

export const metadata: Metadata = {
  title: "勝率計算測驗 - Equity 練習",
  description:
    "測試你對翻前手牌勝率的理解。練習計算 AA vs KK、AK vs 對子等常見對決的勝率，提升概率直覺。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
