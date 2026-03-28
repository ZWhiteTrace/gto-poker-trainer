import { type Card, type PLO4Hand, RANK_VALUES } from "./types";

export type Connectivity = "rundown" | "semi-connected" | "disconnected";

export type SuitKey = "ds" | "ss" | "rainbow";
export type PairKey = "double-paired" | "paired" | "unpaired";

export interface HandCategory {
  /** Stable machine key: e.g. "rundown:ds:unpaired", "disconnected:rainbow:paired" */
  categoryKey: string;

  /** Suit structure */
  isDoubleSuited: boolean;
  isSingleSuited: boolean;
  isRainbow: boolean;
  suitKey: SuitKey;

  /** Pair structure */
  pairCount: number;
  isDoublePaired: boolean;
  pairKey: PairKey;

  /** Connectivity (sorted ranks, gaps between consecutive) */
  connectivity: Connectivity;
  /** Number of gaps between consecutive sorted ranks (e.g. JT87 = 0 gaps, JT86 = 1 gap) */
  gaps: number;
  /** Total gap size (sum of all gaps, e.g. J-9-8-6: gaps between J-9=1, 8-6=1, total=2) */
  totalGapSize: number;

  /** Dangler: a card that doesn't connect to the other 3 */
  danglerCount: number;

  /** High card features */
  hasAce: boolean;
  broadwayCount: number;

  /** Human-readable summary, e.g. "Rundown, double-suited" */
  label: string;
  labelZh: string;
}

export interface HandStrengthBreakdown {
  score: number;
  reasons: string[];
  reasonsZh: string[];
}

/** Ranks considered "broadway" (T, J, Q, K, A) */
const BROADWAY_RANKS = new Set(["A", "K", "Q", "J", "T"]);

/** Count unique suits in 4 cards */
function suitStructure(hand: PLO4Hand): { doubleSuited: boolean; singleSuited: boolean; rainbow: boolean } {
  const suitCounts = new Map<string, number>();
  for (const c of hand) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  }
  const counts = [...suitCounts.values()].sort((a, b) => b - a);

  // Double-suited: exactly 2 suits with 2 cards each (e.g. As Ks Qh Jh)
  const doubleSuited = counts[0] === 2 && counts[1] === 2;
  // Single-suited: exactly 1 suit with 2+ cards (not double-suited)
  const singleSuited = !doubleSuited && counts[0] >= 2;
  const rainbow = counts[0] === 1;

  return { doubleSuited, singleSuited, rainbow };
}

/** Count pairs in 4 cards */
function countPairs(hand: PLO4Hand): number {
  const rankCounts = new Map<string, number>();
  for (const c of hand) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
  }
  let pairs = 0;
  for (const count of rankCounts.values()) {
    if (count >= 2) pairs++;
  }
  return pairs;
}

/**
 * Analyze connectivity of 4 cards.
 * Uses unique rank values sorted descending.
 * A dangler is a card whose nearest neighbor is 3+ ranks away.
 */
function analyzeConnectivity(hand: PLO4Hand): {
  connectivity: Connectivity;
  gaps: number;
  totalGapSize: number;
  danglerCount: number;
} {
  const values = hand.map((c) => RANK_VALUES[c.rank]);
  const unique = [...new Set(values)].sort((a, b) => b - a);

  if (unique.length <= 1) {
    return { connectivity: "disconnected", gaps: 0, totalGapSize: 0, danglerCount: 0 };
  }

  // Calculate gaps between consecutive unique ranks
  const gapSizes: number[] = [];
  for (let i = 0; i < unique.length - 1; i++) {
    const gap = unique[i] - unique[i + 1] - 1;
    gapSizes.push(gap);
  }

  const gaps = gapSizes.filter((g) => g > 0).length;
  const totalGapSize = gapSizes.reduce((sum, g) => sum + g, 0);

  // Dangler detection: a card where min distance to any other card is >= 3
  let danglerCount = 0;
  for (let i = 0; i < unique.length; i++) {
    let minDist = Infinity;
    for (let j = 0; j < unique.length; j++) {
      if (i !== j) {
        minDist = Math.min(minDist, Math.abs(unique[i] - unique[j]));
      }
    }
    if (minDist >= 3) danglerCount++;
  }

  // Also handle Ace as low (value 1) for wheel connectivity
  // A-2-3-4 should be a rundown, A-5-6-7 has A as dangler
  if (unique.includes(14)) {
    const withLowAce = unique.map((v) => (v === 14 ? 1 : v)).sort((a, b) => b - a);
    const lowGapSizes: number[] = [];
    for (let i = 0; i < withLowAce.length - 1; i++) {
      lowGapSizes.push(withLowAce[i] - withLowAce[i + 1] - 1);
    }
    const lowTotalGap = lowGapSizes.reduce((sum, g) => sum + g, 0);

    // If low-ace interpretation is better connected, use it
    if (lowTotalGap < totalGapSize) {
      const lowGaps = lowGapSizes.filter((g) => g > 0).length;

      let lowDanglerCount = 0;
      for (let i = 0; i < withLowAce.length; i++) {
        let minDist = Infinity;
        for (let j = 0; j < withLowAce.length; j++) {
          if (i !== j) minDist = Math.min(minDist, Math.abs(withLowAce[i] - withLowAce[j]));
        }
        if (minDist >= 3) lowDanglerCount++;
      }

      const connectivity: Connectivity =
        lowTotalGap === 0 && withLowAce.length >= 4
          ? "rundown"
          : lowTotalGap <= 2 && lowGaps <= 1
            ? "semi-connected"
            : "disconnected";

      return { connectivity, gaps: lowGaps, totalGapSize: lowTotalGap, danglerCount: lowDanglerCount };
    }
  }

  // Connectivity classification
  let connectivity: Connectivity;
  if (totalGapSize === 0 && unique.length >= 4) {
    connectivity = "rundown";
  } else if (totalGapSize <= 2 && gaps <= 1) {
    connectivity = "semi-connected";
  } else {
    connectivity = "disconnected";
  }

  return { connectivity, gaps, totalGapSize, danglerCount };
}

/** Classify a PLO4 starting hand */
export function categorizeHand(hand: PLO4Hand): HandCategory {
  const suits = suitStructure(hand);
  const pairCount = countPairs(hand);
  const conn = analyzeConnectivity(hand);
  const hasAce = hand.some((c) => c.rank === "A");
  const broadwayCount = hand.filter((c) => BROADWAY_RANKS.has(c.rank)).length;

  // Build label
  const parts: string[] = [];
  const partsZh: string[] = [];

  if (pairCount === 2) {
    parts.push("Double-Paired");
    partsZh.push("雙對子");
  } else if (pairCount === 1) {
    const pairRank = hand.find((c, i) => hand.findIndex((d) => d.rank === c.rank) !== i)?.rank;
    parts.push(`Pair of ${pairRank}`);
    partsZh.push(`一對 ${pairRank}`);
  }

  if (conn.connectivity === "rundown") {
    parts.push("Rundown");
    partsZh.push("順子牌");
  } else if (conn.connectivity === "semi-connected") {
    parts.push("Semi-Connected");
    partsZh.push("半連接");
  } else {
    parts.push("Disconnected");
    partsZh.push("不連接");
  }

  if (suits.doubleSuited) {
    parts.push("Double-Suited");
    partsZh.push("雙花色");
  } else if (suits.singleSuited) {
    parts.push("Single-Suited");
    partsZh.push("單花色");
  } else if (suits.rainbow) {
    parts.push("Rainbow");
    partsZh.push("彩虹");
  }

  if (conn.danglerCount > 0) {
    parts.push(`${conn.danglerCount} Dangler${conn.danglerCount > 1 ? "s" : ""}`);
    partsZh.push(`${conn.danglerCount} 張孤牌`);
  }

  const suitKey: SuitKey = suits.doubleSuited ? "ds" : suits.singleSuited ? "ss" : "rainbow";
  const pairKey: PairKey = pairCount >= 2 ? "double-paired" : pairCount === 1 ? "paired" : "unpaired";
  const categoryKey = `${conn.connectivity}:${suitKey}:${pairKey}`;

  return {
    categoryKey,
    isDoubleSuited: suits.doubleSuited,
    isSingleSuited: suits.singleSuited,
    isRainbow: suits.rainbow,
    suitKey,
    pairCount,
    isDoublePaired: pairCount === 2,
    pairKey,
    connectivity: conn.connectivity,
    gaps: conn.gaps,
    totalGapSize: conn.totalGapSize,
    danglerCount: conn.danglerCount,
    hasAce,
    broadwayCount,
    label: parts.join(", "),
    labelZh: partsZh.join("、"),
  };
}

/** Shorthand: parse "AhKsQdJc" into PLO4Hand and categorize */
export function categorize(input: string | PLO4Hand): HandCategory {
  if (typeof input === "string") {
    const cards: Card[] = [];
    for (let i = 0; i < input.length; i += 2) {
      cards.push({ rank: input[i] as Card["rank"], suit: input[i + 1] as Card["suit"] });
    }
    return categorizeHand(cards as unknown as PLO4Hand);
  }
  return categorizeHand(input);
}

export function evaluateStartingHandStrength(input: string | PLO4Hand): HandStrengthBreakdown {
  const category = categorize(input);
  let score = 0;
  const reasons: string[] = [];
  const reasonsZh: string[] = [];

  if (category.isDoubleSuited) {
    score += 4;
    reasons.push("double-suited");
    reasonsZh.push("雙花色");
  } else if (category.isSingleSuited) {
    score += 2;
    reasons.push("single-suited");
    reasonsZh.push("單花色");
  }

  if (category.connectivity === "rundown") {
    score += 5;
    reasons.push("rundown connectivity");
    reasonsZh.push("順子牌連接性");
  } else if (category.connectivity === "semi-connected") {
    score += 2;
    reasons.push("semi-connected structure");
    reasonsZh.push("半連接結構");
  }

  if (category.isDoublePaired) {
    score += 4;
    reasons.push("double-paired structure");
    reasonsZh.push("雙對子結構");
  } else if (category.pairCount === 1) {
    score += 1;
    reasons.push("made pair potential");
    reasonsZh.push("帶一對結構");
  }

  if (category.hasAce) {
    score += 1;
    reasons.push("ace blocker");
    reasonsZh.push("A blocker");
  }

  if (category.broadwayCount >= 3) {
    score += 2;
    reasons.push("high broadway density");
    reasonsZh.push("高張密度高");
  } else if (category.broadwayCount === 2) {
    score += 1;
    reasons.push("some broadway support");
    reasonsZh.push("有一定高張支撐");
  }

  if (category.danglerCount > 0) {
    score -= category.danglerCount * 2;
    reasons.push(`${category.danglerCount} dangler${category.danglerCount > 1 ? "s" : ""}`);
    reasonsZh.push(`${category.danglerCount} 張孤牌`);
  }

  if (category.totalGapSize > 0) {
    score -= category.totalGapSize;
    reasons.push(`${category.totalGapSize} total gap size`);
    reasonsZh.push(`總 gap ${category.totalGapSize}`);
  }

  return { score, reasons, reasonsZh };
}
