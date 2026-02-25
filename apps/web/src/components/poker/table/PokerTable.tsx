"use client";

import { cn } from "@/lib/utils";
import type { Player, Card } from "@/lib/poker/types";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";
import { Seat } from "./Seat";
import { CommunityCards } from "./CommunityCards";
import { PotDisplay } from "./PotDisplay";
import { AllInBadge } from "./AllInBadge";
import { AI_PROFILES, type AIPlayerProfile } from "@/lib/poker/aiDecisionEngine";

// Tiny card component for compact player display
function MiniCard({ card }: { card: Card }) {
  return (
    <div
      className={cn(
        "flex h-7 w-5 flex-col items-center justify-center rounded-sm border bg-white text-[8px] font-bold",
        SUIT_CARD_COLORS[card.suit]
      )}
    >
      <span>{card.rank}</span>
      <span className="text-[7px]">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

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

// Hero 固定底部，對手在上方弧形排列的座位位置（適配更扁平的牌桌）
const HERO_POSITION = { top: "82%", left: "50%", transform: "translate(-50%, -50%)" };

// 5 個對手的位置（從左到右弧形排列，調整為扁平牌桌）
const OPPONENT_POSITIONS = [
  { top: "22%", left: "6%", transform: "translate(-50%, -50%)" }, // 左上
  { top: "10%", left: "28%", transform: "translate(-50%, -50%)" }, // 左中上
  { top: "10%", left: "50%", transform: "translate(-50%, -50%)" }, // 頂部中央
  { top: "10%", left: "72%", transform: "translate(-50%, -50%)" }, // 右中上
  { top: "22%", left: "94%", transform: "translate(-50%, -50%)" }, // 右上
];

// 根據 Hero 位置計算其他玩家的螢幕顯示位置
function getPlayerScreenPosition(
  player: Player,
  heroSeatIndex: number,
  totalPlayers: number
): { top: string; left: string; transform: string } {
  if (player.isHero) {
    return HERO_POSITION;
  }

  // 計算相對於 Hero 的位置（順時針）
  // Hero 右邊第一個是 index 0，依次遞增
  let relativeIndex = (player.seatIndex - heroSeatIndex - 1 + totalPlayers) % totalPlayers;

  // 確保 relativeIndex 在 0-4 範圍內（5個對手位置）
  if (relativeIndex >= OPPONENT_POSITIONS.length) {
    relativeIndex = OPPONENT_POSITIONS.length - 1;
  }

  return OPPONENT_POSITIONS[relativeIndex];
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
    <div
      className={cn(
        "relative mx-auto aspect-[16/7] w-full max-w-4xl xl:max-w-5xl 2xl:max-w-6xl",
        className
      )}
    >
      {/* 桌面背景 - 更扁平的橢圓形 */}
      <div className="absolute inset-0 rounded-[50%/40%] border-8 border-amber-900 bg-gradient-to-br from-green-800 to-green-900 shadow-2xl">
        {/* 桌面紋理 */}
        <div className="absolute inset-4 rounded-[48%/38%] border-4 border-green-700/50" />

        {/* 中央標誌 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl font-bold tracking-wider text-green-600/20 sm:text-6xl">GTO</div>
        </div>
      </div>

      {/* POT - 左邊中間位置 */}
      <div className="absolute top-1/2 left-6 z-30 -translate-y-1/2">
        <PotDisplay amount={pot} />
      </div>

      {/* 公牌區域 - 中央 */}
      <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform">
        <CommunityCards cards={communityCards} />
      </div>

      {/* 座位 - Hero 固定底部，對手在上方 */}
      {(() => {
        const heroPlayer = players.find((p) => p.isHero);
        const heroSeatIndex = heroPlayer?.seatIndex ?? 0;

        return players.map((player, index) => {
          const position = getPlayerScreenPosition(player, heroSeatIndex, players.length);

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
                aiProfile={
                  !player.isHero
                    ? aiProfiles?.get(player.seatIndex) || getDefaultAIProfile(player.seatIndex)
                    : undefined
                }
                devMode={devMode}
              />
            </div>
          );
        });
      })()}

      {/* 當前下注指示 */}
      {(() => {
        const heroPlayer = players.find((p) => p.isHero);
        const heroSeatIndex = heroPlayer?.seatIndex ?? 0;

        return players.map((player) => {
          if (player.currentBet <= 0) return null;

          // 根據新佈局計算下注籌碼位置
          const betPosition = getBetPositionForNewLayout(player, heroSeatIndex, players.length);

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
        });
      })()}
    </div>
  );
}

// 新佈局的下注籌碼位置（Hero 底部，對手上方，適配扁平牌桌）
const HERO_BET_POSITION = { top: "65%", left: "50%" };

const OPPONENT_BET_POSITIONS = [
  { top: "40%", left: "15%" }, // 左上對應
  { top: "28%", left: "32%" }, // 左中上對應
  { top: "28%", left: "50%" }, // 頂部中央對應
  { top: "28%", left: "68%" }, // 右中上對應
  { top: "40%", left: "85%" }, // 右上對應
];

function getBetPositionForNewLayout(
  player: Player,
  heroSeatIndex: number,
  totalPlayers: number
): { top: string; left: string } {
  if (player.isHero) {
    return HERO_BET_POSITION;
  }

  let relativeIndex = (player.seatIndex - heroSeatIndex - 1 + totalPlayers) % totalPlayers;
  if (relativeIndex >= OPPONENT_BET_POSITIONS.length) {
    relativeIndex = OPPONENT_BET_POSITIONS.length - 1;
  }

  return OPPONENT_BET_POSITIONS[relativeIndex];
}

// 下注籌碼顯示
interface BetChipProps {
  amount: number;
}

function BetChip({ amount }: BetChipProps) {
  return (
    <div className="flex flex-col items-center">
      {/* 籌碼圖示 */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/50 bg-gradient-to-br from-red-500 to-red-700 shadow-lg sm:h-10 sm:w-10">
        <div className="h-5 w-5 rounded-full border border-white/30 sm:h-6 sm:w-6" />
      </div>
      {/* 金額 */}
      <span className="mt-0.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
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
  showAllCards?: boolean;
  devMode?: boolean;
  className?: string;
}

export function CompactPokerTable({
  players,
  communityCards,
  pot,
  activePlayerIndex,
  heroIndex,
  showAllCards = false,
  devMode = false,
  className,
}: CompactPokerTableProps) {
  const hero = players[heroIndex];
  const villains = players.filter((_, i) => i !== heroIndex);
  // Sort villains by position for consistent display
  const positionOrder = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
  const sortedVillains = [...villains].sort(
    (a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
  );

  return (
    <div className={cn("flex h-full flex-col gap-1", className)}>
      {/* 模擬撲克桌 - 綠色背景 */}
      <div className="relative min-h-[160px] flex-1 overflow-hidden rounded-xl border-4 border-amber-800/80 bg-gradient-to-b from-green-800 to-green-900 shadow-inner">
        {/* 桌面紋理 */}
        <div className="absolute inset-2 rounded-xl border-2 border-green-600/30" />

        {/* 對手區域 - 上半部環繞排列 */}
        <div className="absolute top-2 right-0 left-0 flex justify-center gap-1.5 px-2">
          {sortedVillains.map((player) => {
            const isActive = players.indexOf(player) === activePlayerIndex;
            return (
              <MobileOpponentSeat
                key={player.id}
                player={player}
                isActive={isActive}
                showCards={showAllCards || devMode}
              />
            );
          })}
        </div>

        {/* 公牌 + 底池 - 中央 */}
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
          <CommunityCards cards={communityCards} size="sm" />
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1">
            <span className="text-xs font-semibold text-amber-400">POT</span>
            <span className="text-sm font-bold text-white">{pot.toFixed(1)} BB</span>
          </div>
        </div>

        {/* Hero 區域 - 底部 */}
        {hero && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <MobileHeroSeat player={hero} isActive={players.indexOf(hero) === activePlayerIndex} />
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
  showCards?: boolean;
}

function MobileOpponentSeat({ player, isActive, showCards = false }: MobileOpponentSeatProps) {
  return (
    <div
      className={cn(
        "flex min-w-[52px] flex-col items-center rounded-lg p-1.5 transition-all",
        // Active player - glow effect
        isActive &&
          !player.isFolded && [
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
      <span
        className={cn(
          "mb-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
          isActive ? "bg-yellow-400 text-black" : "bg-gray-700 text-gray-300"
        )}
      >
        {player.position}
      </span>

      {/* 手牌狀態 */}
      <div className="my-0.5 flex gap-0.5">
        {player.isFolded ? (
          <span className="text-[9px] text-gray-500 italic">Folded</span>
        ) : showCards && player.holeCards ? (
          <div className="flex gap-0.5">
            <MiniCard card={player.holeCards[0]} />
            <MiniCard card={player.holeCards[1]} />
          </div>
        ) : (
          <>
            <div className="h-7 w-5 rounded-sm border border-blue-400/50 bg-gradient-to-br from-blue-500 to-blue-700" />
            <div className="h-7 w-5 rounded-sm border border-blue-400/50 bg-gradient-to-br from-blue-500 to-blue-700" />
          </>
        )}
      </div>

      {/* 籌碼/下注 */}
      <div className="flex flex-col items-center">
        {player.currentBet > 0 ? (
          <span className="text-[10px] font-semibold text-orange-400">
            {player.currentBet.toFixed(1)}
          </span>
        ) : (
          <span className="text-[10px] text-green-400">{player.stack.toFixed(0)}</span>
        )}
      </div>

      {/* All-in 標記 */}
      {player.isAllIn && <AllInBadge size="sm" />}
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
        "flex items-center gap-2 rounded-xl px-3 py-2 transition-all",
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
      <div className="flex shrink-0 gap-0.5">
        {player.holeCards ? (
          player.holeCards.map((card, i) => (
            <div
              key={i}
              className="flex h-16 w-11 flex-col items-center justify-center rounded-md border-2 border-gray-200 bg-white shadow-lg"
            >
              <span className={cn("text-base leading-none font-bold", SUIT_CARD_COLORS[card.suit])}>
                {card.rank}
              </span>
              <span className={cn("text-lg leading-none", SUIT_CARD_COLORS[card.suit])}>
                {SUIT_SYMBOLS[card.suit]}
              </span>
            </div>
          ))
        ) : (
          <>
            <div className="h-16 w-11 rounded-md border border-blue-400/30 bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg" />
            <div className="h-16 w-11 rounded-md border border-blue-400/30 bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg" />
          </>
        )}
      </div>

      {/* Hero 資訊 */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
            {player.position}
          </span>
          <span className="text-sm font-semibold text-yellow-400">Hero</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
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
            {player.stack.toFixed(1)} BB
          </span>
          {player.currentBet > 0 && (
            <span className="text-xs text-orange-400">Bet: {player.currentBet.toFixed(1)}</span>
          )}
        </div>
      </div>

      {/* YOUR TURN 指示 */}
      {isActive && (
        <div className="shrink-0 animate-pulse rounded-lg bg-yellow-400 px-2 py-1.5 text-xs font-bold text-black">
          YOUR TURN
        </div>
      )}

      {/* All-in 標記 */}
      {player.isAllIn && <AllInBadge className="shrink-0" />}
    </div>
  );
}

// Use centralized SUIT_CARD_COLORS and SUIT_SYMBOLS from types.ts
