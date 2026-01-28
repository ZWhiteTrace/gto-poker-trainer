// ============================================
// Hand Evaluator - 牌力評估器
// ============================================

import type { Card, Rank, Suit, HandRank, HandEvaluation } from "./types";
import { RANKS } from "./types";

// Rank to numeric value (A=14, K=13, ..., 2=2)
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

// Hand rank base values for comparison (higher = better)
const HAND_RANK_BASE: Record<HandRank, number> = {
  royal_flush: 10000000,
  straight_flush: 9000000,
  four_of_a_kind: 8000000,
  full_house: 7000000,
  flush: 6000000,
  straight: 5000000,
  three_of_a_kind: 4000000,
  two_pair: 3000000,
  pair: 2000000,
  high_card: 1000000,
};

// Hand descriptions
const HAND_DESCRIPTIONS: Record<HandRank, { en: string; zh: string }> = {
  royal_flush: { en: "Royal Flush", zh: "皇家同花順" },
  straight_flush: { en: "Straight Flush", zh: "同花順" },
  four_of_a_kind: { en: "Four of a Kind", zh: "四條" },
  full_house: { en: "Full House", zh: "葫蘆" },
  flush: { en: "Flush", zh: "同花" },
  straight: { en: "Straight", zh: "順子" },
  three_of_a_kind: { en: "Three of a Kind", zh: "三條" },
  two_pair: { en: "Two Pair", zh: "兩對" },
  pair: { en: "Pair", zh: "一對" },
  high_card: { en: "High Card", zh: "高牌" },
};

/**
 * Get all 5-card combinations from 7 cards
 */
function getCombinations(cards: Card[], size: number): Card[][] {
  const result: Card[][] = [];

  function combine(start: number, combo: Card[]) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < cards.length; i++) {
      combo.push(cards[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return result;
}

/**
 * Sort cards by rank value (descending)
 */
function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
}

/**
 * Check if cards form a flush (all same suit)
 */
function isFlush(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

/**
 * Check if cards form a straight
 * Returns the high card value if straight, 0 otherwise
 * Handles wheel (A-2-3-4-5) specially
 */
function getStraightHighCard(cards: Card[]): number {
  const sorted = sortByRank(cards);
  const values = sorted.map((c) => RANK_VALUES[c.rank]);

  // Check normal straight
  let isNormalStraight = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      isNormalStraight = false;
      break;
    }
  }
  if (isNormalStraight) return values[0];

  // Check wheel (A-2-3-4-5)
  const wheelValues = [14, 5, 4, 3, 2];
  if (values.every((v, i) => v === wheelValues[i])) {
    return 5; // Wheel's high card is 5
  }

  return 0;
}

/**
 * Count cards by rank
 */
function getRankCounts(cards: Card[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
  }
  return counts;
}

/**
 * Evaluate a 5-card hand
 */
function evaluate5Cards(cards: Card[]): HandEvaluation {
  const sorted = sortByRank(cards);
  const flush = isFlush(cards);
  const straightHigh = getStraightHighCard(cards);
  const rankCounts = getRankCounts(cards);

  // Get counts sorted by frequency then by rank value
  const countEntries = Array.from(rankCounts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count descending
    return RANK_VALUES[b[0]] - RANK_VALUES[a[0]]; // Then by rank descending
  });

  const counts = countEntries.map(([, count]) => count);
  const ranksOrdered = countEntries.map(([rank]) => rank);

  // Calculate kicker values for comparison
  const kickerValue = ranksOrdered.reduce(
    (acc, rank, i) => acc + RANK_VALUES[rank] * Math.pow(15, 4 - i),
    0
  );

  // Royal Flush
  if (flush && straightHigh === 14) {
    return {
      rank: "royal_flush",
      rankValue: HAND_RANK_BASE.royal_flush,
      description: HAND_DESCRIPTIONS.royal_flush.en,
      descriptionZh: HAND_DESCRIPTIONS.royal_flush.zh,
      kickers: ranksOrdered,
    };
  }

  // Straight Flush
  if (flush && straightHigh > 0) {
    return {
      rank: "straight_flush",
      rankValue: HAND_RANK_BASE.straight_flush + straightHigh,
      description: `${HAND_DESCRIPTIONS.straight_flush.en} (${straightHigh} high)`,
      descriptionZh: `${HAND_DESCRIPTIONS.straight_flush.zh} (${straightHigh}高)`,
      kickers: ranksOrdered,
    };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    return {
      rank: "four_of_a_kind",
      rankValue: HAND_RANK_BASE.four_of_a_kind + kickerValue,
      description: `${HAND_DESCRIPTIONS.four_of_a_kind.en} (${ranksOrdered[0]}s)`,
      descriptionZh: `${HAND_DESCRIPTIONS.four_of_a_kind.zh} (${ranksOrdered[0]})`,
      kickers: ranksOrdered,
    };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return {
      rank: "full_house",
      rankValue: HAND_RANK_BASE.full_house + kickerValue,
      description: `${HAND_DESCRIPTIONS.full_house.en} (${ranksOrdered[0]}s full of ${ranksOrdered[1]}s)`,
      descriptionZh: `${HAND_DESCRIPTIONS.full_house.zh} (${ranksOrdered[0]}帶${ranksOrdered[1]})`,
      kickers: ranksOrdered,
    };
  }

  // Flush
  if (flush) {
    return {
      rank: "flush",
      rankValue: HAND_RANK_BASE.flush + kickerValue,
      description: `${HAND_DESCRIPTIONS.flush.en}`,
      descriptionZh: HAND_DESCRIPTIONS.flush.zh,
      kickers: ranksOrdered,
    };
  }

  // Straight
  if (straightHigh > 0) {
    return {
      rank: "straight",
      rankValue: HAND_RANK_BASE.straight + straightHigh,
      description: `${HAND_DESCRIPTIONS.straight.en} (${straightHigh} high)`,
      descriptionZh: `${HAND_DESCRIPTIONS.straight.zh} (${straightHigh}高)`,
      kickers: ranksOrdered,
    };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    return {
      rank: "three_of_a_kind",
      rankValue: HAND_RANK_BASE.three_of_a_kind + kickerValue,
      description: `${HAND_DESCRIPTIONS.three_of_a_kind.en} (${ranksOrdered[0]}s)`,
      descriptionZh: `${HAND_DESCRIPTIONS.three_of_a_kind.zh} (${ranksOrdered[0]})`,
      kickers: ranksOrdered,
    };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return {
      rank: "two_pair",
      rankValue: HAND_RANK_BASE.two_pair + kickerValue,
      description: `${HAND_DESCRIPTIONS.two_pair.en} (${ranksOrdered[0]}s and ${ranksOrdered[1]}s)`,
      descriptionZh: `${HAND_DESCRIPTIONS.two_pair.zh} (${ranksOrdered[0]}和${ranksOrdered[1]})`,
      kickers: ranksOrdered,
    };
  }

  // One Pair
  if (counts[0] === 2) {
    return {
      rank: "pair",
      rankValue: HAND_RANK_BASE.pair + kickerValue,
      description: `${HAND_DESCRIPTIONS.pair.en} (${ranksOrdered[0]}s)`,
      descriptionZh: `${HAND_DESCRIPTIONS.pair.zh} (${ranksOrdered[0]})`,
      kickers: ranksOrdered,
    };
  }

  // High Card
  return {
    rank: "high_card",
    rankValue: HAND_RANK_BASE.high_card + kickerValue,
    description: `${HAND_DESCRIPTIONS.high_card.en} (${ranksOrdered[0]})`,
    descriptionZh: `${HAND_DESCRIPTIONS.high_card.zh} (${ranksOrdered[0]})`,
    kickers: ranksOrdered,
  };
}

/**
 * Evaluate the best 5-card hand from 7 cards (2 hole + 5 community)
 */
export function evaluateHand(holeCards: [Card, Card], communityCards: Card[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    // Not enough cards, return high card based on available cards
    const sorted = sortByRank(allCards);
    return {
      rank: "high_card",
      rankValue: 0,
      description: "Incomplete hand",
      descriptionZh: "牌組不完整",
      kickers: sorted.map((c) => c.rank),
    };
  }

  // Get all 5-card combinations
  const combinations = getCombinations(allCards, 5);

  // Evaluate each combination and find the best
  let bestHand: HandEvaluation | null = null;

  for (const combo of combinations) {
    const evaluation = evaluate5Cards(combo);
    if (!bestHand || evaluation.rankValue > bestHand.rankValue) {
      bestHand = evaluation;
    }
  }

  return bestHand!;
}

/**
 * Compare two hands
 * Returns: positive if hand1 wins, negative if hand2 wins, 0 if tie
 */
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  return hand1.rankValue - hand2.rankValue;
}

/**
 * Determine winners from multiple players
 */
export function determineWinners(
  players: Array<{
    id: string;
    holeCards: [Card, Card];
  }>,
  communityCards: Card[]
): Array<{ playerId: string; evaluation: HandEvaluation }> {
  // Evaluate all hands
  const evaluations = players.map((player) => ({
    playerId: player.id,
    evaluation: evaluateHand(player.holeCards, communityCards),
  }));

  // Find the highest rank value
  const maxRankValue = Math.max(...evaluations.map((e) => e.evaluation.rankValue));

  // Return all players with the highest rank value (handles ties)
  return evaluations.filter((e) => e.evaluation.rankValue === maxRankValue);
}

/**
 * Format hand for display
 */
export function formatHandDescription(evaluation: HandEvaluation, locale: "en" | "zh" = "zh"): string {
  return locale === "zh" ? evaluation.descriptionZh : evaluation.description;
}
