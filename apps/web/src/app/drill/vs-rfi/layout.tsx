import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VS RFI 防守练习 - 面对开池加注的 GTO 策略",
  description:
    "练习面对对手开池加注时的防守策略。学习何时 3-bet、跟注或弃牌，掌握各位置的 GTO 防守范围。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
