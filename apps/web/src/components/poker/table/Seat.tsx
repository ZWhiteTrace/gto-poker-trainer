"use client";

import { cn } from "@/lib/utils";
import type { Player, Position } from "@/lib/poker/types";
import { POSITION_LABELS } from "@/lib/poker/types";
import { HoleCards, CardBack } from "../cards";
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
  0: { top: "85%", left: "50%", transform: "translate(-50%, -50%)" },   // BB (底部中央)
  1: { top: "75%", left: "15%", transform: "translate(-50%, -50%)" },   // SB (左下)
  2: { top: "35%", left: "5%", transform: "translate(-50%, -50%)" },    // BTN (左上)
  3: { top: "10%", left: "50%", transform: "translate(-50%, -50%)" },   // CO (頂部中央)
  4: { top: "35%", left: "95%", transform: "translate(-50%, -50%)" },   // MP (右上)
  5: { top: "75%", left: "85%", transform: "translate(-50%, -50%)" },   // UTG (右下)
};

// Position 到 seatIndex 的映射
export const POSITION_TO_SEAT: Record<Position, number> = {
  BB: 0,
  SB: 1,
  BTN: 2,
  CO: 3,
  MP: 4,
  UTG: 5,
};

export function Seat({ player, isActive = false, isHero = false, showCards = false, aiProfile, devMode = false, className }: SeatProps) {
  if (!player) {
    // 空座位
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center",
          "w-24 h-32 sm:w-28 sm:h-36",
          "rounded-xl border-2 border-dashed border-gray-600/50",
          "bg-gray-800/30",
          className
        )}
      >
        <span className="text-gray-500 text-sm">空位</span>
      </div>
    );
  }

  const positionLabel = POSITION_LABELS[player.position];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 p-2",
        "w-24 sm:w-28",
        "rounded-xl border-2",
        "transition-all duration-300",
        isActive && !player.isFolded
          ? "border-primary ring-2 ring-primary/50 bg-primary/10"
          : "border-gray-600/50 bg-gray-800/50",
        player.isFolded && "opacity-50",
        isHero && "ring-2 ring-yellow-500/50",
        className
      )}
    >
      {/* AI Avatar */}
      {!isHero && aiProfile && (
        <span className="text-2xl" title={aiProfile.descriptionZh}>
          {aiProfile.avatar}
        </span>
      )}

      {/* 位置標籤 */}
      <div
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-semibold",
          isHero
            ? "bg-yellow-500 text-black"
            : player.isDealer
              ? "bg-amber-500 text-black"
              : "bg-gray-700 text-gray-200"
        )}
      >
        {player.position}
      </div>

      {/* 玩家名稱 */}
      <span className={cn("text-xs sm:text-sm font-medium", isHero ? "text-yellow-400" : "text-white")}>
        {player.name}
      </span>

      {/* 手牌 */}
      <div className="my-1">
        {player.holeCards && (showCards || isHero) ? (
          <HoleCards cards={player.holeCards} size="sm" highlighted={isActive} />
        ) : player.holeCards && devMode && !isHero ? (
          // Dev mode: show AI cards with transparency
          <div className="opacity-50">
            <HoleCards cards={player.holeCards} size="sm" highlighted={isActive} />
          </div>
        ) : player.isActive && !player.isFolded ? (
          <div className="flex gap-0.5">
            <CardBack size="sm" />
            <CardBack size="sm" />
          </div>
        ) : player.isFolded ? (
          <div className="text-gray-500 text-xs italic">Folded</div>
        ) : null}
      </div>

      {/* 籌碼堆 */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "text-sm font-bold",
            player.stack > 50 ? "text-green-400" : player.stack > 20 ? "text-yellow-400" : "text-red-400"
          )}
        >
          {player.stack.toFixed(1)} BB
        </span>
        {player.currentBet > 0 && (
          <span className="text-xs text-orange-400">
            Bet: {player.currentBet.toFixed(1)}
          </span>
        )}
      </div>

      {/* 狀態指示器 */}
      {player.isAllIn && (
        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded animate-pulse">
          ALL IN
        </span>
      )}

      {/* Dev mode: AI profile info */}
      {devMode && !isHero && aiProfile && (
        <div className="mt-1 px-1.5 py-0.5 bg-purple-900/50 rounded text-[10px] text-purple-300 border border-purple-500/30">
          <div className="font-semibold">{aiProfile.style}</div>
          <div className="text-purple-400">
            VPIP:{Math.round(aiProfile.vpip * 100)}% PFR:{Math.round(aiProfile.pfr * 100)}% 3bet:{Math.round(aiProfile.threeBetFreq * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}

// 迷你版座位 (用於 mobile 或緊湊視圖)
interface MiniSeatProps {
  player: Player;
  isActive?: boolean;
  className?: string;
}

export function MiniSeat({ player, isActive = false, className }: MiniSeatProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-lg",
        "border",
        isActive ? "border-primary bg-primary/10" : "border-gray-600 bg-gray-800/50",
        player.isFolded && "opacity-50",
        className
      )}
    >
      <span className="text-xs font-semibold text-gray-400">{player.position}</span>
      <span className="text-sm text-white">{player.name}</span>
      <span className="text-xs text-green-400">{player.stack.toFixed(1)}</span>
      {player.currentBet > 0 && <span className="text-xs text-orange-400">({player.currentBet})</span>}
    </div>
  );
}
