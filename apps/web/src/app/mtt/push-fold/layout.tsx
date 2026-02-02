import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Push/Fold 圖表 - MTT 錦標賽短籌碼策略",
  description:
    "基於 Nash 均衡的 Push/Fold 圖表。查看 3-15BB 各位置的最優全下範圍，掌握錦標賽生存策略。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
