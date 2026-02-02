import { Metadata } from "next";

export const metadata: Metadata = {
  title: "翻后 C-Bet 练习 - 持续下注策略训练",
  description:
    "练习翻后持续下注（C-Bet）策略。学习在不同牌面结构下的最优下注频率和尺寸，提升翻后打法。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
