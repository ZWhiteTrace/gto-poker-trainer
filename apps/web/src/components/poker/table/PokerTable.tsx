"use client";

import { cn } from "@/lib/utils";
import type { Player, Card } from "@/lib/poker/types";
import { Seat, SEAT_POSITIONS } from "./Seat";
import { CommunityCards } from "./CommunityCards";
import { PotDisplay } from "./PotDisplay";
import { AI_PROFILES, type AIPlayerProfile } from "@/lib/poker/aiDecisionEngine";

interface PokerTableProps {
  players: Player[];
  communityCards: Card[];
  pot: number;
  activePlayerIndex: number;
  showAllCards?: boolean;
  aiProfiles?: Map<number, AIPlayerProfile>;
  className?: string;
}

// Default AI profile assignment
function getDefaultAIProfile(seatIndex: number): AIPlayerProfile {
  return AI_PROFILES[seatIndex % AI_PROFILES.length];
}

export function PokerTable({
  players,
  communityCards,
  pot,
  activePlayerIndex,
  showAllCards = false,
  aiProfiles,
  className,
}: PokerTableProps) {
  return (
    <div className={cn("relative w-full aspect-[16/10] max-w-4xl mx-auto", className)}>
      {/* 桌面背景 */}
      <div className="absolute inset-0 rounded-[40%] bg-gradient-to-br from-green-800 to-green-900 border-8 border-amber-900 shadow-2xl">
        {/* 桌面紋理 */}
        <div className="absolute inset-4 rounded-[38%] border-4 border-green-700/50" />

        {/* 中央標誌 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-green-600/20 text-4xl sm:text-6xl font-bold tracking-wider">
            GTO
          </div>
        </div>
      </div>

      {/* 公牌區域 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
        <CommunityCards cards={communityCards} />
        <PotDisplay amount={pot} />
      </div>

      {/* 座位 */}
      {players.map((player, index) => {
        const position = SEAT_POSITIONS[player.seatIndex];
        if (!position) return null;

        return (
          <div
            key={player.id}
            className="absolute z-20"
            style={{
              top: position.top,
              left: position.left,
              transform: position.transform,
            }}
          >
            <Seat
              player={player}
              isActive={index === activePlayerIndex && !player.isFolded}
              isHero={player.isHero}
              showCards={showAllCards || player.isHero}
              aiProfile={!player.isHero ? (aiProfiles?.get(player.seatIndex) || getDefaultAIProfile(player.seatIndex)) : undefined}
            />
          </div>
        );
      })}

      {/* 當前下注指示 */}
      {players.map((player) => {
        if (player.currentBet <= 0) return null;
        const position = SEAT_POSITIONS[player.seatIndex];
        if (!position) return null;

        // 計算下注籌碼顯示位置 (靠近桌子中心)
        const betPosition = getBetPosition(player.seatIndex);

        return (
          <div
            key={`bet-${player.id}`}
            className="absolute z-15"
            style={{
              top: betPosition.top,
              left: betPosition.left,
              transform: "translate(-50%, -50%)",
            }}
          >
            <BetChip amount={player.currentBet} />
          </div>
        );
      })}
    </div>
  );
}

// 計算下注籌碼位置
function getBetPosition(seatIndex: number): { top: string; left: string } {
  const positions: Record<number, { top: string; left: string }> = {
    0: { top: "70%", left: "50%" },   // BB
    1: { top: "65%", left: "25%" },   // SB
    2: { top: "45%", left: "20%" },   // BTN
    3: { top: "25%", left: "50%" },   // CO
    4: { top: "45%", left: "80%" },   // MP
    5: { top: "65%", left: "75%" },   // UTG
  };
  return positions[seatIndex] || { top: "50%", left: "50%" };
}

// 下注籌碼顯示
interface BetChipProps {
  amount: number;
}

function BetChip({ amount }: BetChipProps) {
  return (
    <div className="flex flex-col items-center">
      {/* 籌碼圖示 */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-white/50 shadow-lg flex items-center justify-center">
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white/30" />
      </div>
      {/* 金額 */}
      <span className="mt-0.5 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white font-semibold">
        {amount.toFixed(1)}
      </span>
    </div>
  );
}

// 緊湊版撲克桌 (用於 mobile)
interface CompactPokerTableProps {
  players: Player[];
  communityCards: Card[];
  pot: number;
  activePlayerIndex: number;
  heroIndex: number;
  className?: string;
}

export function CompactPokerTable({
  players,
  communityCards,
  pot,
  activePlayerIndex,
  heroIndex,
  className,
}: CompactPokerTableProps) {
  const hero = players[heroIndex];
  const villains = players.filter((_, i) => i !== heroIndex);
  const activeVillains = villains.filter((p) => !p.isFolded);

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {/* 對手區域 */}
      <div className="flex flex-wrap justify-center gap-2">
        {activeVillains.map((player, i) => (
          <div
            key={player.id}
            className={cn(
              "flex flex-col items-center p-2 rounded-lg border",
              players.indexOf(player) === activePlayerIndex
                ? "border-primary bg-primary/10"
                : "border-gray-600 bg-gray-800/50",
              player.isFolded && "opacity-50"
            )}
          >
            <span className="text-xs text-gray-400">{player.position}</span>
            <span className="text-sm text-white">{player.name}</span>
            <span className="text-xs text-green-400">{player.stack.toFixed(1)} BB</span>
            {player.currentBet > 0 && (
              <span className="text-xs text-orange-400">Bet: {player.currentBet}</span>
            )}
          </div>
        ))}
      </div>

      {/* 公牌 + 底池 */}
      <div className="flex flex-col items-center gap-2 py-4 bg-green-900/30 rounded-xl">
        <CommunityCards cards={communityCards} size="sm" />
        <PotDisplay amount={pot} />
      </div>

      {/* Hero 區域 */}
      {hero && (
        <div className="flex flex-col items-center p-3 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10">
          <span className="text-sm text-yellow-400 font-semibold">{hero.position} (Hero)</span>
          <span className="text-lg text-white font-bold">{hero.name}</span>
          <div className="my-2">
            {hero.holeCards && (
              <div className="flex gap-1">
                {/* Inline card display for compact view */}
                {hero.holeCards.map((card, i) => (
                  <div
                    key={i}
                    className="w-12 h-16 bg-white rounded flex flex-col items-center justify-center shadow"
                  >
                    <span className={cn("font-bold", getCardColor(card.suit))}>{card.rank}</span>
                    <span className={cn("text-sm", getCardColor(card.suit))}>
                      {getSuitSymbol(card.suit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <span className="text-green-400 font-semibold">{hero.stack.toFixed(1)} BB</span>
        </div>
      )}
    </div>
  );
}

function getCardColor(suit: string): string {
  const colors: Record<string, string> = {
    s: "text-slate-900",  // 黑桃：黑色
    h: "text-red-500",    // 紅心：紅色
    d: "text-blue-500",   // 方塊：藍色
    c: "text-green-700",  // 梅花：深綠色
  };
  return colors[suit] || "text-black";
}

function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    s: "♠",
    h: "♥",
    d: "♦",
    c: "♣",
  };
  return symbols[suit] || suit;
}
