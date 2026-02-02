import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 逻辑测验 - 博弈论原理理解",
  description:
    "测试你对 GTO 博弈论原理的理解。学习平衡范围、剥削策略、混合频率等核心概念。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
