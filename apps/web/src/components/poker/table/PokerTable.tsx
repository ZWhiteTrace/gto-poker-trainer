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
  devMode?: boolean;
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
  devMode = false,
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
              devMode={devMode}
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
  // Sort villains by position for consistent display
  const positionOrder = ["UTG", "MP", "CO", "BTN", "SB", "BB"];
  const sortedVillains = [...villains].sort(
    (a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* 對手區域 - 緊湊的橫向列表 */}
      <div className="flex justify-center gap-1 overflow-x-auto pb-1">
        {sortedVillains.map((player) => {
          const isActive = players.indexOf(player) === activePlayerIndex;
          return (
            <div
              key={player.id}
              className={cn(
                "flex flex-col items-center px-2 py-1 rounded-lg min-w-[60px] shrink-0",
                isActive && "ring-2 ring-yellow-400 bg-yellow-400/10",
                player.isFolded && "opacity-40"
              )}
            >
              <span className="text-[10px] text-gray-400">{player.position}</span>
              <span className="text-[11px] text-white truncate max-w-[56px]">{player.name}</span>
              <span className={cn(
                "text-[10px]",
                player.currentBet > 0 ? "text-orange-400" : "text-green-400"
              )}>
                {player.currentBet > 0 ? `${player.currentBet.toFixed(1)}` : `${player.stack.toFixed(0)}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* 公牌 + 底池 - 更緊湊 */}
      <div className="flex flex-col items-center gap-1 py-2 bg-green-900/40 rounded-lg">
        <CommunityCards cards={communityCards} size="sm" />
        <div className="flex items-center gap-1.5 text-amber-400">
          <span className="text-xs">POT</span>
          <span className="text-sm font-bold">{pot.toFixed(1)} BB</span>
        </div>
      </div>

      {/* Hero 區域 - 突出顯示 */}
      {hero && (
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg border",
          players.indexOf(hero) === activePlayerIndex
            ? "border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400/50"
            : "border-yellow-500/30 bg-yellow-500/10"
        )}>
          {/* Hero 手牌 */}
          <div className="flex gap-0.5 shrink-0">
            {hero.holeCards ? (
              hero.holeCards.map((card, i) => (
                <div
                  key={i}
                  className="w-10 h-14 bg-white rounded shadow flex flex-col items-center justify-center"
                >
                  <span className={cn("text-sm font-bold leading-none", getCardColor(card.suit))}>
                    {card.rank}
                  </span>
                  <span className={cn("text-base leading-none", getCardColor(card.suit))}>
                    {getSuitSymbol(card.suit)}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="w-10 h-14 bg-blue-800 rounded shadow" />
                <div className="w-10 h-14 bg-blue-800 rounded shadow" />
              </>
            )}
          </div>

          {/* Hero 資訊 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-semibold text-sm">{hero.position}</span>
              <span className="text-white text-sm">Hero</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">{hero.stack.toFixed(1)} BB</span>
              {hero.currentBet > 0 && (
                <span className="text-orange-400">Bet: {hero.currentBet.toFixed(1)}</span>
              )}
            </div>
          </div>

          {/* 輪到 Hero 的指示 */}
          {players.indexOf(hero) === activePlayerIndex && (
            <div className="shrink-0 px-2 py-1 bg-yellow-400 text-black text-xs font-bold rounded">
              YOUR TURN
            </div>
          )}
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
