import { Metadata } from "next";

export const metadata: Metadata = {
  title: "排行榜 - 德扑训练玩家排名",
  description:
    "查看 GTO Poker Trainer 玩家排名。比较练习手数、准确率和连胜记录，与其他玩家一较高下。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
