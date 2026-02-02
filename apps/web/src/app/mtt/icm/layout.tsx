import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICM 计算器 - 锦标赛筹码价值计算",
  description:
    "免费在线 ICM 计算器。计算锦标赛中筹码的真实美元价值，理解泡沫期和决赛桌的 ICM 压力。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
