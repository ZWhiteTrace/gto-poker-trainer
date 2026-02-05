import { Metadata } from "next";

export const metadata: Metadata = {
  title: "牌面質地訓練 - 學會分析 Board Texture",
  description:
    "訓練判斷牌面質地的能力。辨識乾燥、濕潤、連接牌面，學會根據牌面調整策略。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
