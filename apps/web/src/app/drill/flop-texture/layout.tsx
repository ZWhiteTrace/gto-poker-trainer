import { Metadata } from "next";

export const metadata: Metadata = {
  title: "牌面结构分析练习 - Flop Texture 识别训练",
  description:
    "学习识别不同的翻牌面结构（干燥、湿润、配对等），理解牌面结构如何影响你的策略选择。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
