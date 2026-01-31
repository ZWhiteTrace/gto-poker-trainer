import type { Card, Rank, BoardTexture } from "./types";

export interface BoardAnalysis {
  texture: BoardTexture;
  textureZh: string;
  isMonotone: boolean;
  isPaired: boolean;
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  highCard: Rank;
  connectedness: number; // 0-1, how connected the board is
  isDry: boolean;
  isWet: boolean;
}

const RANK_VALUES: Record<Rank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};

export function analyzeBoardTexture(communityCards: Card[]): BoardAnalysis {
  if (communityCards.length === 0) {
    return {
      texture: "dry",
      textureZh: "無公牌",
      isMonotone: false,
      isPaired: false,
      hasFlushDraw: false,
      hasStraightDraw: false,
      highCard: "A",
      connectedness: 0,
      isDry: true,
      isWet: false,
    };
  }

  // Count suits
  const suitCounts: Record<string, number> = {};
  for (const card of communityCards) {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  const isMonotone = maxSuitCount >= 3;
  const hasFlushDraw = maxSuitCount >= 2;

  // Count ranks for pairs
  const rankCounts: Record<string, number> = {};
  for (const card of communityCards) {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  }
  const isPaired = Object.values(rankCounts).some((count) => count >= 2);

  // Check connectedness (straight possibilities)
  const rankValues = communityCards
    .map((c) => RANK_VALUES[c.rank])
    .sort((a, b) => b - a);
  const uniqueRankValues = Array.from(new Set(rankValues));
  let connectedness = 0;
  let hasStraightDraw = false;

  for (let i = 0; i < uniqueRankValues.length - 1; i++) {
    const gap = uniqueRankValues[i] - uniqueRankValues[i + 1];
    if (gap === 1) {
      connectedness += 0.5;
      hasStraightDraw = true;
    } else if (gap === 2) {
      connectedness += 0.25;
      hasStraightDraw = true;
    } else if (gap === 3) {
      connectedness += 0.1;
    }
  }

  const maxRank = Math.max(...uniqueRankValues);
  const minRank = Math.min(...uniqueRankValues);
  const rankSpan = maxRank - minRank;
  const spanThreshold = communityCards.length >= 4 ? 5 : 4;
  if (rankSpan <= spanThreshold) {
    connectedness += 0.2;
    hasStraightDraw = true;
  }

  // Wheel possibilities (A-2-3-4-5)
  if (uniqueRankValues.includes(14) && uniqueRankValues.some((r) => r <= 5)) {
    connectedness += 0.2;
    hasStraightDraw = true;
  }

  connectedness = Math.min(connectedness, 1);

  // Determine overall texture
  let texture: BoardTexture;
  let textureZh: string;

  if (isMonotone) {
    texture = "monotone";
    textureZh = "單花面 (三張同花)";
  } else if (isPaired) {
    texture = "paired";
    textureZh = "對子面";
  } else if (hasFlushDraw && connectedness >= 0.6) {
    texture = "wet";
    textureZh = "濕潤面 (多重聽牌)";
  } else if (hasStraightDraw && connectedness >= 0.6) {
    texture = "connected";
    textureZh = "連接面 (順子可能)";
  } else if (hasFlushDraw) {
    texture = "semi_wet";
    textureZh = "半濕潤面";
  } else if (hasStraightDraw || connectedness >= 0.35) {
    texture = "connected";
    textureZh = "連接面 (順子可能)";
  } else {
    texture = "dry";
    textureZh = "乾燥面 (無明顯聽牌)";
  }

  const highCard = communityCards.reduce((a, b) =>
    RANK_VALUES[a.rank] > RANK_VALUES[b.rank] ? a : b
  ).rank;

  const isWet = hasFlushDraw || hasStraightDraw || connectedness > 0.5;
  const isDry = !isWet && !isPaired;

  return {
    texture,
    textureZh,
    isMonotone,
    isPaired,
    hasFlushDraw,
    hasStraightDraw,
    highCard,
    connectedness,
    isDry,
    isWet,
  };
}
