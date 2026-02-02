import { Metadata } from "next";

export const metadata: Metadata = {
  title: "排行榜 - 德撲訓練玩家排名",
  description:
    "查看 GTO Poker Trainer 玩家排名。比較練習手數、準確率和連勝記錄，與其他玩家一較高下。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
