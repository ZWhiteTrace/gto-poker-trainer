import { Metadata } from "next";

export const metadata: Metadata = {
  title: "撲克測驗中心 - 檢驗你的德撲知識",
  description:
    "通過互動測驗檢驗你的撲克知識。包含勝率計算、Outs 計算、EV 期望值、GTO 邏輯等多種測驗類型。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
