import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Squeeze 練習 - 多人底池 3-Bet 訓練",
  description:
    "練習多人底池的 Squeeze（擠壓加注）策略。學習何時 3-Bet、何時 Call、何時 Fold，掌握 Squeeze 時機。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
