import { Metadata } from "next";

export const metadata: Metadata = {
  title: "EV 期望值計算測驗 - 底池賠率練習",
  description:
    "練習計算期望值（EV）和底池賠率。學會判斷跟注是否有利可圖，用數學思維做出正確決策。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
