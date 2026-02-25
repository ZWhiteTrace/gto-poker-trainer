"use client";

import { cn } from "@/lib/utils";
import type { SidePot } from "@/lib/poker/types";

interface PotDisplayProps {
  amount: number;
  sidePots?: SidePot[];
  className?: string;
}

export function PotDisplay({ amount, sidePots = [], className }: PotDisplayProps) {
  const totalPot = amount + sidePots.reduce((sum, sp) => sum + sp.amount, 0);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {/* 主底池 */}
      <div className="flex items-center gap-2 rounded-full border border-amber-500/50 bg-black/60 px-4 py-2">
        <ChipStack size="sm" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">POT</span>
          <span className="text-lg font-bold text-amber-400">{totalPot.toFixed(1)} BB</span>
        </div>
      </div>

      {/* 邊池 (如果有) */}
      {sidePots.length > 0 && (
        <div className="flex gap-2">
          {sidePots.map((sidePot, index) => (
            <div
              key={index}
              className="rounded border border-gray-600 bg-black/50 px-2 py-1 text-xs text-gray-300"
            >
              Side #{index + 1}: {sidePot.amount.toFixed(1)} BB
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 籌碼堆圖示
interface ChipStackProps {
  size?: "sm" | "md" | "lg";
}

function ChipStack({ size = "md" }: ChipStackProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <div className={cn("relative", sizeClasses[size])}>
      {/* 籌碼堆疊效果 */}
      <div className="absolute bottom-0 left-0 h-2 w-full rounded-full border border-amber-500/50 bg-gradient-to-b from-amber-600 to-amber-800" />
      <div className="absolute bottom-1 left-0 h-2 w-full rounded-full border border-red-400/50 bg-gradient-to-b from-red-500 to-red-700" />
      <div className="absolute bottom-2 left-0 h-2 w-full rounded-full border border-blue-400/50 bg-gradient-to-b from-blue-500 to-blue-700" />
      <div className="absolute bottom-3 left-0 h-2 w-full rounded-full border border-green-400/50 bg-gradient-to-b from-green-500 to-green-700" />
    </div>
  );
}

// 簡單底池顯示 (用於緊湊視圖)
interface SimplePotProps {
  amount: number;
  className?: string;
}

export function SimplePot({ amount, className }: SimplePotProps) {
  return (
    <span className={cn("font-semibold text-amber-400", className)}>
      Pot: {amount.toFixed(1)} BB
    </span>
  );
}
