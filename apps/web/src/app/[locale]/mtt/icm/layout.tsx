import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICM 計算器 - 錦標賽籌碼價值計算",
  description:
    "免費在線 ICM 計算器。計算錦標賽中籌碼的真實美元價值，理解泡沫期和決賽桌的 ICM 壓力。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
