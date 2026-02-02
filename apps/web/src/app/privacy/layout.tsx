import { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私政策 - GTO Poker Trainer",
  description:
    "GTO Poker Trainer 的隱私政策。了解我們如何收集、使用和保護你的個人資訊。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
