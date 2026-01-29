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

// 緊湊版撲克桌 (用於 mobile) - 重新設計版
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
    <div className={cn("flex flex-col gap-2 h-full", className)}>
      {/* 模擬撲克桌 - 綠色背景 */}
      <div className="relative flex-1 min-h-[200px] bg-gradient-to-b from-green-800 to-green-900 rounded-2xl border-4 border-amber-800/80 shadow-inner overflow-hidden">
        {/* 桌面紋理 */}
        <div className="absolute inset-2 rounded-xl border-2 border-green-600/30" />

        {/* 對手區域 - 上半部環繞排列 */}
        <div className="absolute top-2 left-0 right-0 flex justify-center gap-1.5 px-2">
          {sortedVillains.map((player) => {
            const isActive = players.indexOf(player) === activePlayerIndex;
            return (
              <MobileOpponentSeat
                key={player.id}
                player={player}
                isActive={isActive}
              />
            );
          })}
        </div>

        {/* 公牌 + 底池 - 中央 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
          <CommunityCards cards={communityCards} size="sm" />
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 rounded-full">
            <span className="text-amber-400 text-xs font-semibold">POT</span>
            <span className="text-white text-sm font-bold">{pot.toFixed(1)} BB</span>
          </div>
        </div>

        {/* Hero 區域 - 底部 */}
        {hero && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <MobileHeroSeat
              player={hero}
              isActive={players.indexOf(hero) === activePlayerIndex}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile 對手座位元件
interface MobileOpponentSeatProps {
  player: Player;
  isActive: boolean;
}

function MobileOpponentSeat({ player, isActive }: MobileOpponentSeatProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center p-1.5 rounded-lg transition-all min-w-[52px]",
        // Active player - glow effect
        isActive && !player.isFolded && [
          "bg-yellow-400/20",
          "shadow-[0_0_12px_rgba(250,204,21,0.5)]",
          "ring-2 ring-yellow-400",
        ],
        // Folded
        player.isFolded && "opacity-40",
        // Normal
        !isActive && !player.isFolded && "bg-black/30"
      )}
    >
      {/* 位置標籤 */}
      <span className={cn(
        "text-[9px] font-semibold px-1.5 py-0.5 rounded-full mb-0.5",
        isActive ? "bg-yellow-400 text-black" : "bg-gray-700 text-gray-300"
      )}>
        {player.position}
      </span>

      {/* 手牌狀態 */}
      <div className="flex gap-0.5 my-0.5">
        {player.isFolded ? (
          <span className="text-[9px] text-gray-500 italic">Folded</span>
        ) : (
          <>
            <div className="w-5 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-sm border border-blue-400/50" />
            <div className="w-5 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-sm border border-blue-400/50" />
          </>
        )}
      </div>

      {/* 籌碼/下注 */}
      <div className="flex flex-col items-center">
        {player.currentBet > 0 ? (
          <span className="text-[10px] text-orange-400 font-semibold">
            {player.currentBet.toFixed(1)}
          </span>
        ) : (
          <span className="text-[10px] text-green-400">
            {player.stack.toFixed(0)}
          </span>
        )}
      </div>

      {/* All-in 標記 */}
      {player.isAllIn && (
        <span className="text-[8px] bg-red-600 text-white px-1 rounded font-bold animate-pulse">
          ALL IN
        </span>
      )}
    </div>
  );
}

// Mobile Hero 座位元件
interface MobileHeroSeatProps {
  player: Player;
  isActive: boolean;
}

function MobileHeroSeat({ player, isActive }: MobileHeroSeatProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
        // Active - prominent glow
        isActive && [
          "bg-yellow-400/20",
          "shadow-[0_0_20px_rgba(250,204,21,0.6)]",
          "ring-2 ring-yellow-400",
        ],
        // Not active
        !isActive && "bg-black/50 ring-1 ring-yellow-500/30"
      )}
    >
      {/* Hero 手牌 - 使用較大的牌 */}
      <div className="flex gap-0.5 shrink-0">
        {player.holeCards ? (
          player.holeCards.map((card, i) => (
            <div
              key={i}
              className="w-11 h-16 bg-white rounded-md shadow-lg flex flex-col items-center justify-center border-2 border-gray-200"
            >
              <span className={cn("text-base font-bold leading-none", getCardColor(card.suit))}>
                {card.rank}
              </span>
              <span className={cn("text-lg leading-none", getCardColor(card.suit))}>
                {getSuitSymbol(card.suit)}
              </span>
            </div>
          ))
        ) : (
          <>
            <div className="w-11 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-md shadow-lg border border-blue-400/30" />
            <div className="w-11 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-md shadow-lg border border-blue-400/30" />
          </>
        )}
      </div>

      {/* Hero 資訊 */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded">
            {player.position}
          </span>
          <span className="text-yellow-400 text-sm font-semibold">Hero</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn(
            "text-sm font-bold",
            player.stack > 50 ? "text-green-400" : player.stack > 20 ? "text-yellow-400" : "text-red-400"
          )}>
            {player.stack.toFixed(1)} BB
          </span>
          {player.currentBet > 0 && (
            <span className="text-xs text-orange-400">
              Bet: {player.currentBet.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* YOUR TURN 指示 */}
      {isActive && (
        <div className="shrink-0 px-2 py-1.5 bg-yellow-400 text-black text-xs font-bold rounded-lg animate-pulse">
          YOUR TURN
        </div>
      )}

      {/* All-in 標記 */}
      {player.isAllIn && (
        <span className="shrink-0 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded animate-pulse">
          ALL IN
        </span>
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
