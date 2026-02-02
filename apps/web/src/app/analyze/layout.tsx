import { Metadata } from "next";

export const metadata: Metadata = {
  title: "手牌历史分析 - 找出你的 GTO 漏洞",
  description:
    "上传 GGPoker 手牌历史，AI 自动分析你的翻前漏洞。找出 RFI、3-bet、4-bet 决策中的错误，提供改进建议。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
