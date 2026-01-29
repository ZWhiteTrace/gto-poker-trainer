import { Metadata } from "next";
import TableTrainerClient from "./TableTrainerClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "GTO Table Trainer | 撲克桌訓練",
  description: "完整 6-max 撲克桌訓練系統，練習各個位置的 GTO 策略",
};

export default function TableTrainerPage() {
  return (
    <ErrorBoundary>
      <TableTrainerClient />
    </ErrorBoundary>
  );
}
