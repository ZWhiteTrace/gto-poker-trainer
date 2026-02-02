import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Push/Fold 推圖練習 - MTT 短籌碼全下策略",
  description:
    "練習錦標賽短籌碼時的 Push/Fold 決策。基於 Nash 均衡的最優全下範圍，掌握 3-15BB 的生存策略。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
