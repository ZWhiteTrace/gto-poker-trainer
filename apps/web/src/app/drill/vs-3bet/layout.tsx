import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VS 3-Bet 應對練習 - 面對 3-Bet 的 GTO 策略",
  description:
    "練習開池後面對 3-bet 的應對策略。學習何時 4-bet、跟注或棄牌，掌握 GTO 最優決策。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
