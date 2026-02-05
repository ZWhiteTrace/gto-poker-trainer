import { Metadata } from "next";

export const metadata: Metadata = {
  title: "個人檔案 - GTO 撲克訓練器",
  description:
    "管理你的 GTO 訓練器個人檔案。查看等級、成就、訓練記錄，自訂偏好設定。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
