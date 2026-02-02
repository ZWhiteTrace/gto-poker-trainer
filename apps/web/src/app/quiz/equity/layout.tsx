import { Metadata } from "next";

export const metadata: Metadata = {
  title: "胜率计算测验 - Equity 练习",
  description:
    "测试你对翻前手牌胜率的理解。练习计算 AA vs KK、AK vs 对子等常见对决的胜率，提升概率直觉。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
