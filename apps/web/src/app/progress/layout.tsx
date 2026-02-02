import { Metadata } from "next";

export const metadata: Metadata = {
  title: "学习进度 - 追踪你的训练数据",
  description:
    "查看你的 GTO 训练进度。统计各练习类型的准确率、弱点区域分析、历史活动记录。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
