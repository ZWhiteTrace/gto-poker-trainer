import { Metadata } from "next";

export const metadata: Metadata = {
  title: "服务条款 - GTO Poker Trainer",
  description:
    "GTO Poker Trainer 的服务条款。使用本网站前请阅读并了解相关条款和条件。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
