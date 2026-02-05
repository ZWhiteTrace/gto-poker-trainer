import { Metadata } from "next";

export const metadata: Metadata = {
  title: "多街道練習 - Flop Turn River 連續決策訓練",
  description:
    "練習翻牌到河牌的多街道決策。從 Preflop 到 River 完整模擬，提升翻後策略思維。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
