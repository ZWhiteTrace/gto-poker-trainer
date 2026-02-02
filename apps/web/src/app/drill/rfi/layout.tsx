import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RFI 翻前開池練習 - 免費德州撲克 GTO 訓練",
  description:
    "練習各位置的 RFI（Raise First In）開池範圍。掌握 UTG、HJ、CO、BTN、SB 的 GTO 開牌策略，即時反饋幫你快速進步。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
