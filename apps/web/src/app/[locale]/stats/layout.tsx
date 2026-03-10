import { Metadata } from "next";

export const metadata: Metadata = {
  title: "練習統計 - 追蹤你的 GTO 訓練表現",
  description:
    "查看詳細的 GTO 訓練統計數據。各位置準確率、練習趨勢圖表、弱點分析，幫你針對性提升。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
