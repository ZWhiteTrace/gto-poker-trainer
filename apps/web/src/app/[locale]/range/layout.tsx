import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 範圍表查看器 - 翻前範圍可視化",
  description:
    "以 13x13 網格可視化查看 GTO 翻前範圍。包含 RFI、VS RFI、VS 3-Bet、VS 4-Bet 的完整範圍表。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
