import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Push/Fold 图表 - MTT 锦标赛短筹码策略",
  description:
    "基于 Nash 均衡的 Push/Fold 图表。查看 3-15BB 各位置的最优全下范围，掌握锦标赛生存策略。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
