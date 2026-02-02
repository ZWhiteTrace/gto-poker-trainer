import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Outs 计算测验 - 听牌出路练习",
  description:
    "练习计算翻后听牌的 Outs 数量。同花听牌、顺子听牌、组合听牌，快速判断改进概率。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
