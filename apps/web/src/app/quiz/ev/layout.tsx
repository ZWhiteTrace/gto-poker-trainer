import { Metadata } from "next";

export const metadata: Metadata = {
  title: "EV 期望值计算测验 - 底池赔率练习",
  description:
    "练习计算期望值（EV）和底池赔率。学会判断跟注是否有利可图，用数学思维做出正确决策。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
