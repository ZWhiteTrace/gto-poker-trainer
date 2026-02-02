import { Metadata } from "next";

export const metadata: Metadata = {
  title: "扑克测验中心 - 检验你的德扑知识",
  description:
    "通过互动测验检验你的扑克知识。包含勝率计算、Outs 计算、EV 期望值、GTO 逻辑等多种测验类型。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
