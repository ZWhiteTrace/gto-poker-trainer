import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VS 3-Bet 应对练习 - 面对 3-Bet 的 GTO 策略",
  description:
    "练习开池后面对 3-bet 的应对策略。学习何时 4-bet、跟注或弃牌，掌握 GTO 最优决策。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
