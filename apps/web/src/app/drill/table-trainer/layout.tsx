import { Metadata } from "next";

export const metadata: Metadata = {
  title: "牌桌模擬訓練 - 全場景 GTO 實戰練習",
  description: "在模擬牌桌上進行 GTO 實戰訓練。面對不同位置與場景，做出最優決策。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
