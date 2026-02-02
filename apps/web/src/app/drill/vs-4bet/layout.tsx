import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VS 4-Bet 应对练习 - 面对 4-Bet 的 GTO 策略",
  description:
    "练习 3-bet 后面对 4-bet 的应对策略。学习何时 5-bet 全下、跟注或弃牌，掌握高压情况下的 GTO 决策。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
