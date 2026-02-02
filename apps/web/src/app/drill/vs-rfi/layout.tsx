import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VS RFI 防守練習 - 面對開池加注的 GTO 策略",
  description:
    "練習面對對手開池加注時的防守策略。學習何時 3-bet、跟注或棄牌，掌握各位置的 GTO 防守範圍。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
