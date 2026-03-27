import {
  type Card,
  type PLO4Hand,
  type Board,
  type HandResult,
  HandRank,
  RANK_VALUES,
} from "./types";

/**
 * PLO4 Hand Evaluator
 *
 * Key rule: Must use EXACTLY 2 hole cards + EXACTLY 3 board cards.
 * Evaluates all C(4,2) × C(board,3) combinations and returns the best.
 */

/** Generate all C(n,k) combinations from an array */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  const [first, ...rest] = arr;
  for (const combo of combinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }
  result.push(...combinations(rest, k));
  return result;
}

/** Sort cards by rank value descending */
function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
}

/** Evaluate a 5-card poker hand */
function evaluate5(cards: [Card, Card, Card, Card, Card]): {
  rank: HandRank;
  kickers: number[];
  description: string;
} {
  const sorted = sortByRank(cards);
  const values = sorted.map((c) => RANK_VALUES[c.rank]);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight (including A-low: A-2-3-4-5)
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;

  if (uniqueValues.length >= 5) {
    // Normal straight check
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
        isStraight = true;
        straightHigh = uniqueValues[i];
        break;
      }
    }
    // Wheel: A-2-3-4-5
    if (!isStraight && uniqueValues.includes(14)) {
      const lowValues = uniqueValues.filter((v) => v <= 5);
      if (lowValues.length >= 4 && lowValues[0] === 5 && lowValues[3] === 2) {
        isStraight = true;
        straightHigh = 5; // 5-high straight
      }
    }
  }

  // Count rank frequencies
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  const groups = [...freq.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // by count desc
    return b[0] - a[0]; // by rank desc
  });

  const rankNames: Record<number, string> = {
    14: "Aces",
    13: "Kings",
    12: "Queens",
    11: "Jacks",
    10: "Tens",
    9: "Nines",
    8: "Eights",
    7: "Sevens",
    6: "Sixes",
    5: "Fives",
    4: "Fours",
    3: "Threes",
    2: "Twos",
  };
  const singularNames: Record<number, string> = {
    14: "Ace",
    13: "King",
    12: "Queen",
    11: "Jack",
    10: "Ten",
    9: "Nine",
    8: "Eight",
    7: "Seven",
    6: "Six",
    5: "Five",
    4: "Four",
    3: "Three",
    2: "Two",
  };

  const counts = groups.map(([, c]) => c);
  const kickers = groups.map(([v]) => v);

  // Royal Flush
  if (isFlush && isStraight && straightHigh === 14) {
    return { rank: HandRank.RoyalFlush, kickers: [14], description: "Royal Flush" };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return {
      rank: HandRank.StraightFlush,
      kickers: [straightHigh],
      description: `Straight Flush, ${singularNames[straightHigh]}-high`,
    };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    return {
      rank: HandRank.FourOfAKind,
      kickers,
      description: `Four of a Kind, ${rankNames[kickers[0]]}`,
    };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return {
      rank: HandRank.FullHouse,
      kickers,
      description: `Full House, ${rankNames[kickers[0]]} full of ${rankNames[kickers[1]]}`,
    };
  }

  // Flush
  if (isFlush) {
    return {
      rank: HandRank.Flush,
      kickers: values,
      description: `Flush, ${singularNames[values[0]]}-high`,
    };
  }

  // Straight
  if (isStraight) {
    return {
      rank: HandRank.Straight,
      kickers: [straightHigh],
      description: `Straight, ${singularNames[straightHigh]}-high`,
    };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    return {
      rank: HandRank.ThreeOfAKind,
      kickers,
      description: `Three of a Kind, ${rankNames[kickers[0]]}`,
    };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return {
      rank: HandRank.TwoPair,
      kickers,
      description: `Two Pair, ${rankNames[kickers[0]]} and ${rankNames[kickers[1]]}`,
    };
  }

  // One Pair
  if (counts[0] === 2) {
    return {
      rank: HandRank.OnePair,
      kickers,
      description: `One Pair, ${rankNames[kickers[0]]}`,
    };
  }

  // High Card
  return {
    rank: HandRank.HighCard,
    kickers: values,
    description: `High Card, ${singularNames[values[0]]}`,
  };
}

/** Compare two kicker arrays. Returns positive if a > b, negative if a < b, 0 if equal */
function compareKickers(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Find the best PLO4 hand.
 * Must use exactly 2 from holeCards + exactly 3 from board.
 */
export function evaluatePLO4Hand(holeCards: PLO4Hand, board: Board): HandResult {
  if (board.length < 3 || board.length > 5) {
    throw new Error(`Board must have 3-5 cards, got ${board.length}`);
  }

  const holeCombos = combinations([...holeCards], 2) as [Card, Card][];
  const boardCombos = combinations(board, 3) as [Card, Card, Card][];

  let best: {
    rank: HandRank;
    kickers: number[];
    description: string;
    five: [Card, Card, Card, Card, Card];
    holeUsed: [Card, Card];
    boardUsed: [Card, Card, Card];
  } | null = null;

  for (const hole2 of holeCombos) {
    for (const board3 of boardCombos) {
      const five = [...hole2, ...board3] as [Card, Card, Card, Card, Card];
      const result = evaluate5(five);

      if (
        !best ||
        result.rank > best.rank ||
        (result.rank === best.rank && compareKickers(result.kickers, best.kickers) > 0)
      ) {
        best = {
          ...result,
          five,
          holeUsed: hole2,
          boardUsed: board3,
        };
      }
    }
  }

  if (!best) throw new Error("No valid hand found");

  return {
    rank: best.rank,
    description: best.description,
    bestFive: best.five,
    holeCardsUsed: best.holeUsed,
    boardCardsUsed: best.boardUsed,
  };
}

/** Helper: create a Card from shorthand like "Ah", "Ts", "2c" */
export function card(s: string): Card {
  const rank = s[0] as Card["rank"];
  const suit = s[1] as Card["suit"];
  return { rank, suit };
}

/** Helper: create a PLO4Hand from shorthand like "AhKsQdJc" or ["Ah","Ks","Qd","Jc"] */
export function plo4Hand(input: string | [string, string, string, string]): PLO4Hand {
  const strs = Array.isArray(input)
    ? input
    : ([input.slice(0, 2), input.slice(2, 4), input.slice(4, 6), input.slice(6, 8)] as [
        string,
        string,
        string,
        string,
      ]);
  return strs.map(card) as unknown as PLO4Hand;
}
