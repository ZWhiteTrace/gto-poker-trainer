import { Metadata } from "next";

export const metadata: Metadata = {
  title: "翻後 C-Bet 練習 - 持續下注策略訓練",
  description:
    "練習翻後持續下注（C-Bet）策略。學習在不同牌面結構下的最優下注頻率和尺寸，提升翻後打法。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
