import { Metadata } from "next";

export const metadata: Metadata = {
  title: "成就系统 - 解锁德扑训练徽章",
  description:
    "通过练习解锁成就徽章。里程碑成就、连胜成就、准确率成就等，让训练更有成就感。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
