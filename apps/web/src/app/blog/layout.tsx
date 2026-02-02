import { Metadata } from "next";

export const metadata: Metadata = {
  title: "德撲部落格 - 撲克策略文章",
  description:
    "閱讀最新的德州撲克策略文章。GTO 理論解析、實戰技巧、手牌分析等高質量中文內容。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
