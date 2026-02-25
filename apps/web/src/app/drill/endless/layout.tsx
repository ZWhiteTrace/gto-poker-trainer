import { Metadata } from "next";

export const metadata: Metadata = {
  title: "無限練習模式 - 持續訓練 GTO 翻前決策",
  description: "不間斷的 GTO 翻前練習。隨機場景持續挑戰，追蹤連勝紀錄，強化肌肉記憶。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
