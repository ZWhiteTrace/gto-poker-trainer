import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Push/Fold 推图练习 - MTT 短筹码全下策略",
  description:
    "练习锦标赛短筹码时的 Push/Fold 决策。基于 Nash 均衡的最优全下范围，掌握 3-15BB 的生存策略。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
