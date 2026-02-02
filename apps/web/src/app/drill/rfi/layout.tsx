import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RFI 翻前开池练习 - 免费德州扑克 GTO 训练",
  description:
    "练习各位置的 RFI（Raise First In）开池范围。掌握 UTG、HJ、CO、BTN、SB 的 GTO 开牌策略，即时反馈帮你快速进步。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
