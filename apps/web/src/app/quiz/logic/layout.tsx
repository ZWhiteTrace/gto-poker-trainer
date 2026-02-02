import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 邏輯測驗 - 博弈論原理理解",
  description:
    "測試你對 GTO 博弈論原理的理解。學習平衡範圍、剝削策略、混合頻率等核心概念。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
