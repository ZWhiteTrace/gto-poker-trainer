import { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 - GTO Poker Trainer",
  description:
    "GTO Poker Trainer 的隐私政策。了解我们如何收集、使用和保护你的个人信息。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
