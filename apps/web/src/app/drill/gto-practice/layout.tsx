import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTO 对练模式 - 与 AI 进行翻前实战练习",
  description:
    "与 GTO AI 进行翻前对练。模拟真实牌局场景，AI 根据 GTO 频率做决策，帮你在实战中理解 GTO 策略。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
