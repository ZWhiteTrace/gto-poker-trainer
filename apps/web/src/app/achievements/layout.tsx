import { Metadata } from "next";

export const metadata: Metadata = {
  title: "成就系統 - 解鎖德撲訓練徽章",
  description: "通過練習解鎖成就徽章。里程碑成就、連勝成就、準確率成就等，讓訓練更有成就感。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
