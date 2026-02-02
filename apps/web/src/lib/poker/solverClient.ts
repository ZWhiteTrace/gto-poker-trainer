/**
 * Solver API Client
 * Fetches precomputed GTO strategies from the backend
 */

import type { Card, HoleCards, Position } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================
// Types
// ============================================

export interface SolverStrategy {
  bet_33?: number;
  bet_50?: number;
  bet_66?: number;
  bet_75?: number;
  bet_100?: number;
  check?: number;
}

export interface SolverQueryResult {
  found: boolean;
  scenario_id?: string;
  position?: string;
  villain?: string;
  board?: string[];
  texture?: string;
  texture_zh?: string;
  hand?: string;
  strategy?: SolverStrategy;
  message?: string;
}

export interface TextureData {
  texture_id: string;
  texture_zh: string;
  category: string;
  difficulty: number;
  representative_board: string[];
  concept: {
    title: string;
    summary: string;
    key_points: string[];
    common_mistakes: string[];
  };
  strategies: Record<string, SolverStrategy & { note?: string }>;
}

// ============================================
// Cache
// ============================================

const solverCache = new Map<string, SolverQueryResult>();
const textureCache = new Map<string, TextureData>();

// ============================================
// Helpers
// ============================================

/**
 * Convert Card[] to board string for API query
 * e.g., [{rank: 'A', suit: 'h'}, {rank: 'K', suit: 's'}, {rank: '5', suit: 'd'}] -> "AhKs5d"
 */
export function cardsToString(cards: Card[]): string {
  return cards.map(c => `${c.rank}${c.suit}`).join("");
}

/**
 * Convert HoleCards to hand string for API query
 * e.g., [{rank: 'A', suit: 'h'}, {rank: 'K', suit: 's'}] -> "AKo"
 */
export function holeCardsToHandString(holeCards: HoleCards): string {
  const [c1, c2] = holeCards;
  const r1 = c1.rank;
  const r2 = c2.rank;
  const suited = c1.suit === c2.suit;

  // Pocket pair
  if (r1 === r2) {
    return `${r1}${r2}`;
  }

  // Sort by rank value
  const rankValues: Record<string, number> = {
    A: 14, K: 13, Q: 12, J: 11, T: 10,
    "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
  };

  const [high, low] = rankValues[r1] > rankValues[r2] ? [r1, r2] : [r2, r1];
  return `${high}${low}${suited ? "s" : "o"}`;
}

/**
 * Map our Position type to solver position
 * 6-max positions: UTG, HJ, CO, BTN, SB, BB
 */
export function mapPosition(position: Position): string {
  const positionMap: Record<Position, string> = {
    UTG: "UTG",
    HJ: "HJ",
    CO: "CO",
    BTN: "BTN",
    SB: "SB",
    BB: "BB",
  };
  return positionMap[position] || "BTN";
}

/**
 * Determine villain position based on hero position in SRP
 */
export function getVillainPosition(heroPosition: Position): string {
  // In SRP, if hero is IP, villain is usually BB
  // Simplification: assume BTN vs BB or CO vs BB scenarios
  if (heroPosition === "BB") return "BTN";
  if (heroPosition === "SB") return "BB";
  return "BB"; // Default to BB as villain
}

// ============================================
// API Functions
// ============================================

/**
 * Query solver for postflop strategy
 */
export async function querySolverStrategy(
  board: Card[],
  holeCards: HoleCards,
  heroPosition: Position,
  villainPosition?: string,
  potType: string = "srp"
): Promise<SolverQueryResult> {
  const boardStr = cardsToString(board);
  const handStr = holeCardsToHandString(holeCards);
  const posStr = mapPosition(heroPosition);
  const villStr = villainPosition || getVillainPosition(heroPosition);

  const cacheKey = `${boardStr}-${handStr}-${posStr}-${villStr}-${potType}`;

  // Check cache
  if (solverCache.has(cacheKey)) {
    return solverCache.get(cacheKey)!;
  }

  try {
    const url = `${API_BASE}/api/solver/postflop?board=${boardStr}&hand=${handStr}&position=${posStr}&villain=${villStr}&pot_type=${potType}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return { found: false, message: "API request failed" };
    }

    const result: SolverQueryResult = await response.json();

    // Cache result
    solverCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Solver query failed:", error);
    return { found: false, message: "Network error" };
  }
}

/**
 * Get Level 1 texture data
 */
export async function getTextureData(textureId: string): Promise<TextureData | null> {
  if (textureCache.has(textureId)) {
    return textureCache.get(textureId)!;
  }

  try {
    const url = `${API_BASE}/api/solver/level1/texture/${textureId}/hands`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Convert to TextureData format
    const textureData: TextureData = {
      texture_id: data.texture_id,
      texture_zh: data.texture_zh,
      category: "",
      difficulty: 1,
      representative_board: data.board,
      concept: data.concept,
      strategies: {},
    };

    // Flatten hands from categories
    for (const category of Object.values(data.hands_by_category || {}) as Array<Array<{ hand: string } & SolverStrategy>>) {
      for (const handData of category) {
        const { hand, ...strategy } = handData;
        textureData.strategies[hand] = strategy;
      }
    }

    textureCache.set(textureId, textureData);
    return textureData;
  } catch (error) {
    console.error("Failed to fetch texture data:", error);
    return null;
  }
}

/**
 * Map board texture to Level 1 texture ID
 */
export function mapBoardToTextureId(
  board: Card[],
  boardTexture: string,
  highCard: string
): string | null {
  if (board.length < 3) return null;

  // Check for monotone (all same suit)
  const suits = board.map(c => c.suit);
  const isMonotone = suits.every(s => s === suits[0]);
  if (isMonotone) return "monotone";

  // Check for paired board
  const ranks = board.map(c => c.rank);
  const rankCounts: Record<string, number> = {};
  for (const r of ranks) {
    rankCounts[r] = (rankCounts[r] || 0) + 1;
  }
  const hasPair = Object.values(rankCounts).some(c => c >= 2);

  if (hasPair) {
    // High pair (T+) or low pair
    const rankValues: Record<string, number> = {
      A: 14, K: 13, Q: 12, J: 11, T: 10,
      "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
    };
    const pairedRank = Object.entries(rankCounts).find(([, c]) => c >= 2)?.[0];
    if (pairedRank && rankValues[pairedRank] >= 10) {
      return "paired_high";
    }
    return "paired_low";
  }

  // Check for connected board
  const rankValues: Record<string, number> = {
    A: 14, K: 13, Q: 12, J: 11, T: 10,
    "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
  };
  const sortedValues = ranks.map(r => rankValues[r]).sort((a, b) => b - a);
  const gaps = [];
  for (let i = 0; i < sortedValues.length - 1; i++) {
    gaps.push(sortedValues[i] - sortedValues[i + 1]);
  }
  const isConnected = gaps.every(g => g <= 2);

  if (isConnected && Math.max(...sortedValues) - Math.min(...sortedValues) <= 4) {
    const avgRank = sortedValues.reduce((a, b) => a + b, 0) / sortedValues.length;
    if (avgRank >= 10) return "connected_high";
    if (avgRank >= 7) return "connected_middle";
    return "connected_low";
  }

  // Check for two-tone
  const suitCounts: Record<string, number> = {};
  for (const s of suits) {
    suitCounts[s] = (suitCounts[s] || 0) + 1;
  }
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  const isTwoTone = maxSuitCount === 2;

  if (isTwoTone) {
    const maxRankValue = Math.max(...sortedValues);
    if (maxRankValue >= 13) return "two_tone_high"; // A or K high
    return "two_tone_low";
  }

  // Dry boards
  const maxRankValue = Math.max(...sortedValues);
  if (maxRankValue === 14) return "dry_ace_high";
  if (maxRankValue === 13) return "dry_king_high";
  if (maxRankValue === 12) return "dry_queen_high";
  return "dry_low";
}

/**
 * Convert solver strategy to GTOHint recommendations format
 */
export function solverStrategyToRecommendations(
  strategy: SolverStrategy
): Array<{
  action: "bet" | "check" | "call" | "raise" | "fold";
  frequency: number;
  sizing?: number;
  isPrimary: boolean;
}> {
  const recommendations: Array<{
    action: "bet" | "check" | "call" | "raise" | "fold";
    frequency: number;
    sizing?: number;
    isPrimary: boolean;
  }> = [];

  // Collect all actions with frequencies
  const actions: Array<{ action: string; frequency: number; sizing?: number }> = [];

  if (strategy.bet_33 && strategy.bet_33 > 0) {
    actions.push({ action: "bet", frequency: strategy.bet_33, sizing: 33 });
  }
  if (strategy.bet_50 && strategy.bet_50 > 0) {
    actions.push({ action: "bet", frequency: strategy.bet_50, sizing: 50 });
  }
  if (strategy.bet_66 && strategy.bet_66 > 0) {
    actions.push({ action: "bet", frequency: strategy.bet_66, sizing: 66 });
  }
  if (strategy.bet_75 && strategy.bet_75 > 0) {
    actions.push({ action: "bet", frequency: strategy.bet_75, sizing: 75 });
  }
  if (strategy.bet_100 && strategy.bet_100 > 0) {
    actions.push({ action: "bet", frequency: strategy.bet_100, sizing: 100 });
  }
  if (strategy.check && strategy.check > 0) {
    actions.push({ action: "check", frequency: strategy.check });
  }

  // Sort by frequency descending
  actions.sort((a, b) => b.frequency - a.frequency);

  // Convert to recommendations
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    recommendations.push({
      action: action.action as "bet" | "check",
      frequency: action.frequency,
      sizing: action.sizing,
      isPrimary: i === 0,
    });
  }

  return recommendations;
}

/**
 * Clear solver cache
 */
export function clearSolverCache(): void {
  solverCache.clear();
  textureCache.clear();
}
