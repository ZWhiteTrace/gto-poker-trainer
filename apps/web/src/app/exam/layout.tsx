import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 模拟考 - 综合德扑知识测验",
  description:
    "用计时测验检验你的 GTO 知识。涵盖 GTO 理论、手牌胜率、位置策略、Push/Fold 决策等综合内容。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
