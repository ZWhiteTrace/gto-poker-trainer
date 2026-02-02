import { Metadata } from "next";

export const metadata: Metadata = {
  title: "德扑博客 - 扑克策略文章",
  description:
    "阅读最新的德州扑克策略文章。GTO 理论解析、实战技巧、手牌分析等高质量中文内容。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
