"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Player, Position } from "@/lib/poker/types";
import { HoleCards, CardBack } from "../cards";
import { AllInBadge } from "./AllInBadge";
import type { AIPlayerProfile } from "@/lib/poker/aiDecisionEngine";

interface SeatProps {
  player: Player | null;
  isActive?: boolean;
  isHero?: boolean;
  showCards?: boolean;
  aiProfile?: AIPlayerProfile;
  devMode?: boolean;
  className?: string;
}

// 座位位置配置 (6-max 橢圓佈局)
export const SEAT_POSITIONS: Record<number, { top: string; left: string; transform: string }> = {
  0: { top: "85%", left: "50%", transform: "translate(-50%, -50%)" }, // BB (底部中央)
  1: { top: "75%", left: "15%", transform: "translate(-50%, -50%)" }, // SB (左下)
  2: { top: "35%", left: "5%", transform: "translate(-50%, -50%)" }, // BTN (左上)
  3: { top: "10%", left: "50%", transform: "translate(-50%, -50%)" }, // CO (頂部中央)
  4: { top: "35%", left: "95%", transform: "translate(-50%, -50%)" }, // MP (右上)
  5: { top: "75%", left: "85%", transform: "translate(-50%, -50%)" }, // UTG (右下)
};

// Position 到 seatIndex 的映射
export const POSITION_TO_SEAT: Record<Position, number> = {
  BB: 0,
  SB: 1,
  BTN: 2,
  CO: 3,
  HJ: 4,
  UTG: 5,
};

export const Seat = memo(function Seat({
  player,
  isActive = false,
  isHero = false,
  showCards = false,
  aiProfile,
  devMode = false,
  className,
}: SeatProps) {
  if (!player) {
    // 空座位
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          "min-w-[100px] px-3 py-2",
          "rounded-xl border-2 border-dashed border-gray-600/50",
          "bg-gray-800/30",
          className
        )}
      >
        <span className="text-sm text-gray-500">空位</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 px-2 py-2",
        "rounded-xl border-2",
        "transition-all duration-300",
        // Active player - prominent glow effect
        isActive &&
          !player.isFolded && [
            "border-yellow-400",
            "bg-yellow-400/10",
            "shadow-[0_0_20px_rgba(250,204,21,0.4)]",
            "animate-pulse",
          ],
        // Inactive player
        !isActive && "border-gray-600/50 bg-gray-800/50",
        // Folded player
        player.isFolded && "opacity-50",
        // Hero styling (when not active)
        isHero && !isActive && "border-yellow-500/50 ring-2 ring-yellow-500/30",
        className
      )}
    >
      {/* 手牌 - 上方 */}
      <div className="shrink-0">
        {player.holeCards && (showCards || isHero) ? (
          <HoleCards cards={player.holeCards} size="sm" highlighted={isActive} />
        ) : player.holeCards && devMode && !isHero ? (
          <div className="opacity-50">
            <HoleCards cards={player.holeCards} size="sm" highlighted={isActive} />
          </div>
        ) : player.isActive && !player.isFolded ? (
          <div className="flex gap-0.5">
            <CardBack size="sm" />
            <CardBack size="sm" />
          </div>
        ) : player.isFolded ? (
          <div className="text-xs text-gray-500 italic">Fold</div>
        ) : null}
      </div>

      {/* 資訊區 - 下方：位置 + 名字 + BB */}
      <div className="flex flex-col items-center gap-0.5">
        {/* 位置標籤 + 名字 */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-bold",
              isHero
                ? "bg-yellow-500 text-black"
                : player.isDealer
                  ? "bg-amber-500 text-black"
                  : "bg-gray-700 text-gray-200"
            )}
          >
            {player.position}
          </span>
          {/* 玩家名字（非 Hero 時顯示） */}
          {!isHero && (
            <span className="max-w-[50px] truncate text-[10px] text-gray-400" title={player.name}>
              {player.name}
            </span>
          )}
        </div>

        {/* BB 顯示 + All-in */}
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-sm font-bold",
              player.stack > 50
                ? "text-green-400"
                : player.stack > 20
                  ? "text-yellow-400"
                  : "text-red-400"
            )}
          >
            {player.stack.toFixed(1)}
          </span>

          {/* All-in 標記 */}
          {player.isAllIn && <AllInBadge size="sm" />}
        </div>
      </div>

      {/* Dev mode: AI profile info */}
      {devMode && !isHero && aiProfile && (
        <div className="rounded border border-purple-500/30 bg-purple-900/50 px-1.5 py-0.5 text-[10px] text-purple-300">
          <div className="text-purple-400">
            {aiProfile.style} {Math.round(aiProfile.vpip * 100)}/{Math.round(aiProfile.pfr * 100)}/
            {Math.round(aiProfile.threeBetFreq * 100)}
          </div>
        </div>
      )}
    </div>
  );
});

// 迷你版座位 (用於 mobile 或緊湊視圖)
interface MiniSeatProps {
  player: Player;
  isActive?: boolean;
  className?: string;
}

export const MiniSeat = memo(function MiniSeat({
  player,
  isActive = false,
  className,
}: MiniSeatProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1",
        "border",
        isActive ? "border-primary bg-primary/10" : "border-gray-600 bg-gray-800/50",
        player.isFolded && "opacity-50",
        className
      )}
    >
      <span className="text-xs font-semibold text-gray-400">{player.position}</span>
      <span className="text-sm text-white">{player.name}</span>
      <span className="text-xs text-green-400">{player.stack.toFixed(1)}</span>
      {player.currentBet > 0 && (
        <span className="text-xs text-orange-400">({player.currentBet})</span>
      )}
    </div>
  );
});
