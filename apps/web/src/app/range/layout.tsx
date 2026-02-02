import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 范围表查看器 - 翻前范围可视化",
  description:
    "以 13x13 网格可视化查看 GTO 翻前范围。包含 RFI、VS RFI、VS 3-Bet、VS 4-Bet 的完整范围表。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
