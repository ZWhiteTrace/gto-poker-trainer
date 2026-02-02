import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 對練模式 - 與 AI 進行翻前實戰練習",
  description:
    "與 GTO AI 進行翻前對練。模擬真實牌局場景，AI 根據 GTO 頻率做決策，幫你在實戰中理解 GTO 策略。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
