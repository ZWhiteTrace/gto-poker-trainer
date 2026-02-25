import { Metadata } from "next";

export const metadata: Metadata = {
  title: "學習進度 - 追蹤你的訓練數據",
  description: "查看你的 GTO 訓練進度。統計各練習類型的準確率、弱點區域分析、歷史活動記錄。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
