import { Metadata } from "next";

export const metadata: Metadata = {
  title: "手牌歷史分析 - 找出你的 GTO 漏洞",
  description:
    "上傳 GGPoker 手牌歷史，AI 自動分析你的翻前漏洞。找出 RFI、3-bet、4-bet 決策中的錯誤，提供改進建議。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
