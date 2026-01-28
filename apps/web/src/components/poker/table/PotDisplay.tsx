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
      <div className="flex items-center gap-2 px-4 py-2 bg-black/60 rounded-full border border-amber-500/50">
        <ChipStack size="sm" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">POT</span>
          <span className="text-lg font-bold text-amber-400">
            {totalPot.toFixed(1)} BB
          </span>
        </div>
      </div>

      {/* 邊池 (如果有) */}
      {sidePots.length > 0 && (
        <div className="flex gap-2">
          {sidePots.map((sidePot, index) => (
            <div
              key={index}
              className="px-2 py-1 bg-black/50 rounded text-xs text-gray-300 border border-gray-600"
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
      <div className="absolute bottom-0 left-0 w-full h-2 rounded-full bg-gradient-to-b from-amber-600 to-amber-800 border border-amber-500/50" />
      <div className="absolute bottom-1 left-0 w-full h-2 rounded-full bg-gradient-to-b from-red-500 to-red-700 border border-red-400/50" />
      <div className="absolute bottom-2 left-0 w-full h-2 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 border border-blue-400/50" />
      <div className="absolute bottom-3 left-0 w-full h-2 rounded-full bg-gradient-to-b from-green-500 to-green-700 border border-green-400/50" />
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
    <span className={cn("text-amber-400 font-semibold", className)}>
      Pot: {amount.toFixed(1)} BB
    </span>
  );
}
