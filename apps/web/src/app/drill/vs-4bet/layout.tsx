import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VS 4-Bet 應對練習 - 面對 4-Bet 的 GTO 策略",
  description:
    "練習 3-bet 後面對 4-bet 的應對策略。學習何時 5-bet 全下、跟注或棄牌，掌握高壓情況下的 GTO 決策。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
