/**
 * Flop Texture Analysis System
 * Based on GTO theory with 12 strategic texture categories
 */

import type { Card, Suit, Rank } from "./types";

// ============================================
// Types
// ============================================

export type FlopTextureType =
  | "dry_ace_high"
  | "dry_king_high"
  | "dry_queen_high"
  | "dry_low_rainbow"
  | "paired_high"
  | "paired_low"
  | "wet_broadway"
  | "wet_middle_connected"
  | "wet_low_connected"
  | "monotone"
  | "twotone_dry"
  | "twotone_wet";

export type SuitDistribution = "rainbow" | "twotone" | "monotone";
export type Connectivity = "disconnected" | "semi_connected" | "connected";
export type HighCard = "ace" | "king" | "queen" | "jack" | "low";
export type Wetness = "dry" | "medium" | "wet";

export interface FlopTextureCategory {
  id: FlopTextureType;
  nameZh: string;
  nameEn: string;
  cbet: number; // Recommended C-bet frequency %
  sizing: number; // Recommended sizing % of pot
  description: string;
  descriptionZh: string;
}

export interface FlopAnalysis {
  texture: FlopTextureType;
  suitDistribution: SuitDistribution;
  connectivity: Connectivity;
  highCard: HighCard;
  wetness: Wetness;
  isPaired: boolean;
  isTrips: boolean;
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  connectednessScore: number; // 0-1
}

// ============================================
// Constants
// ============================================

export const FLOP_TEXTURE_CATEGORIES: Record<FlopTextureType, FlopTextureCategory> = {
  dry_ace_high: {
    id: "dry_ace_high",
    nameZh: "乾燥A高",
    nameEn: "Dry Ace-High",
    cbet: 75,
    sizing: 33,
    description: "Ace-high rainbow with no connectivity. Favors preflop aggressor heavily.",
    descriptionZh: "A高彩虹牌面，無連接性。強烈有利於翻前進攻者。",
  },
  dry_king_high: {
    id: "dry_king_high",
    nameZh: "乾燥K高",
    nameEn: "Dry King-High",
    cbet: 60,
    sizing: 50,
    description: "King-high rainbow with minimal connectivity.",
    descriptionZh: "K高彩虹牌面，連接性極低。",
  },
  dry_queen_high: {
    id: "dry_queen_high",
    nameZh: "乾燥Q高",
    nameEn: "Dry Queen-High",
    cbet: 55,
    sizing: 50,
    description: "Queen-high rainbow board with low connectivity.",
    descriptionZh: "Q高彩虹牌面，連接性低。",
  },
  dry_low_rainbow: {
    id: "dry_low_rainbow",
    nameZh: "乾燥低牌彩虹",
    nameEn: "Dry Low Rainbow",
    cbet: 35,
    sizing: 66,
    description: "Low cards with rainbow suits. Favors caller's range.",
    descriptionZh: "低牌彩虹牌面。有利於跟注者範圍。",
  },
  paired_high: {
    id: "paired_high",
    nameZh: "高對子面",
    nameEn: "High Paired Board",
    cbet: 70,
    sizing: 25,
    description: "High card paired board. Use small sizing, high frequency.",
    descriptionZh: "高牌配對牌面。使用小尺寸、高頻率。",
  },
  paired_low: {
    id: "paired_low",
    nameZh: "低對子面",
    nameEn: "Low Paired Board",
    cbet: 65,
    sizing: 33,
    description: "Low card paired board. Still favors aggressor.",
    descriptionZh: "低牌配對牌面。仍有利於進攻者。",
  },
  wet_broadway: {
    id: "wet_broadway",
    nameZh: "濕潤大牌連接",
    nameEn: "Wet Broadway",
    cbet: 45,
    sizing: 66,
    description: "Connected broadway cards. Many draws possible.",
    descriptionZh: "連接大牌牌面。多種聽牌可能。",
  },
  wet_middle_connected: {
    id: "wet_middle_connected",
    nameZh: "中間連接牌面",
    nameEn: "Wet Middle Connected",
    cbet: 40,
    sizing: 75,
    description: "Connected middle cards. Favors caller's range.",
    descriptionZh: "中間連接牌面。有利於跟注者範圍。",
  },
  wet_low_connected: {
    id: "wet_low_connected",
    nameZh: "低牌連接",
    nameEn: "Wet Low Connected",
    cbet: 30,
    sizing: 50,
    description: "Connected low cards. Check frequently.",
    descriptionZh: "低牌連接牌面。應經常過牌。",
  },
  monotone: {
    id: "monotone",
    nameZh: "單花面",
    nameEn: "Monotone",
    cbet: 50,
    sizing: 50,
    description: "All three cards same suit. Flush already possible.",
    descriptionZh: "三張同花。已有同花完成可能。",
  },
  twotone_dry: {
    id: "twotone_dry",
    nameZh: "雙花乾燥",
    nameEn: "Two-tone Dry",
    cbet: 55,
    sizing: 50,
    description: "Two cards same suit, disconnected board.",
    descriptionZh: "兩張同花，牌面斷開。",
  },
  twotone_wet: {
    id: "twotone_wet",
    nameZh: "雙花濕潤",
    nameEn: "Two-tone Wet",
    cbet: 35,
    sizing: 66,
    description: "Two cards same suit with connectivity.",
    descriptionZh: "兩張同花且有連接性。",
  },
};

// Rank values for comparison
const RANK_VALUES: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

// ============================================
// Analysis Functions
// ============================================

/**
 * Analyze suit distribution of a flop
 */
export function analyzeSuitDistribution(suits: Suit[]): SuitDistribution {
  const suitCounts = new Map<Suit, number>();
  for (const suit of suits) {
    suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
  }

  const maxCount = Math.max(...suitCounts.values());
  if (maxCount === 3) return "monotone";
  if (maxCount === 2) return "twotone";
  return "rainbow";
}

/**
 * Get high card category
 */
export function getHighCard(ranks: Rank[]): HighCard {
  const values = ranks.map(r => RANK_VALUES[r] || 0);
  const maxValue = Math.max(...values);

  if (maxValue === 14) return "ace";
  if (maxValue === 13) return "king";
  if (maxValue === 12) return "queen";
  if (maxValue === 11) return "jack";
  return "low";
}

/**
 * Calculate connectivity score (0-1)
 * Higher score = more connected
 */
export function calculateConnectedness(ranks: Rank[]): number {
  const values = ranks.map(r => RANK_VALUES[r] || 0).sort((a, b) => a - b);

  // Check for gaps
  const gap1 = values[1] - values[0];
  const gap2 = values[2] - values[1];

  // Perfect straight = 1,1 gaps = score 1.0
  // One gap of 1 = score 0.7
  // Both gaps of 2 = score 0.5
  // Larger gaps = lower score

  if (gap1 === 1 && gap2 === 1) return 1.0; // Perfect: 789
  if ((gap1 === 1 && gap2 === 2) || (gap1 === 2 && gap2 === 1)) return 0.8; // 79T
  if (gap1 === 1 || gap2 === 1) return 0.6; // One connector
  if ((gap1 === 2 && gap2 === 2) || gap1 + gap2 <= 4) return 0.4; // Gapped
  if (gap1 + gap2 <= 6) return 0.2; // Somewhat connected
  return 0.0; // Disconnected
}

/**
 * Get connectivity category
 */
export function getConnectivity(ranks: Rank[]): Connectivity {
  const score = calculateConnectedness(ranks);
  if (score >= 0.7) return "connected";
  if (score >= 0.3) return "semi_connected";
  return "disconnected";
}

/**
 * Check if board is paired
 */
export function checkPaired(ranks: Rank[]): { isPaired: boolean; isTrips: boolean } {
  const counts = new Map<Rank, number>();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) || 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  return {
    isPaired: maxCount >= 2,
    isTrips: maxCount === 3,
  };
}

/**
 * Determine wetness level
 */
export function getWetness(
  suitDist: SuitDistribution,
  connectivity: Connectivity,
  isPaired: boolean
): Wetness {
  // Paired boards are generally dry
  if (isPaired) return "dry";

  // Monotone is wet
  if (suitDist === "monotone") return "wet";

  // Connected + twotone = very wet
  if (connectivity === "connected" && suitDist === "twotone") return "wet";

  // Connected = medium wet
  if (connectivity === "connected") return "medium";

  // Semi-connected + twotone = medium wet
  if (connectivity === "semi_connected" && suitDist === "twotone") return "medium";

  // Otherwise dry
  return "dry";
}

/**
 * Full flop texture analysis
 */
export function analyzeFlop(ranks: Rank[], suits: Suit[]): FlopAnalysis {
  const suitDistribution = analyzeSuitDistribution(suits);
  const highCard = getHighCard(ranks);
  const connectivity = getConnectivity(ranks);
  const { isPaired, isTrips } = checkPaired(ranks);
  const wetness = getWetness(suitDistribution, connectivity, isPaired);
  const connectednessScore = calculateConnectedness(ranks);

  // Determine texture type
  const texture = determineTextureType(
    highCard,
    suitDistribution,
    connectivity,
    isPaired,
    isTrips,
    wetness
  );

  return {
    texture,
    suitDistribution,
    connectivity,
    highCard,
    wetness,
    isPaired,
    isTrips,
    hasFlushDraw: suitDistribution === "twotone" || suitDistribution === "monotone",
    hasStraightDraw: connectivity !== "disconnected",
    connectednessScore,
  };
}

/**
 * Determine the specific texture type
 */
function determineTextureType(
  highCard: HighCard,
  suitDist: SuitDistribution,
  connectivity: Connectivity,
  isPaired: boolean,
  isTrips: boolean,
  wetness: Wetness
): FlopTextureType {
  // Paired/Trips boards
  if (isTrips || isPaired) {
    if (highCard === "ace" || highCard === "king" || highCard === "queen") {
      return "paired_high";
    }
    return "paired_low";
  }

  // Monotone
  if (suitDist === "monotone") {
    return "monotone";
  }

  // Two-tone boards
  if (suitDist === "twotone") {
    if (connectivity === "connected" || wetness === "wet") {
      return "twotone_wet";
    }
    return "twotone_dry";
  }

  // Rainbow boards (most common)
  if (connectivity === "connected") {
    if (highCard === "ace" || highCard === "king" || highCard === "queen" || highCard === "jack") {
      return "wet_broadway";
    }
    if (highCard === "low") {
      return "wet_low_connected";
    }
    return "wet_middle_connected";
  }

  // Dry rainbow boards
  if (highCard === "ace") return "dry_ace_high";
  if (highCard === "king") return "dry_king_high";
  if (highCard === "queen") return "dry_queen_high";

  return "dry_low_rainbow";
}

/**
 * Generate a random flop of a specific texture
 */
export function generateFlopOfTexture(texture: FlopTextureType): { ranks: Rank[]; suits: Suit[] } {
  const allRanks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const allSuits: Suit[] = ["s", "h", "d", "c"];

  const shuffleArray = <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  let ranks: Rank[];
  let suits: Suit[];

  switch (texture) {
    case "dry_ace_high":
      ranks = ["A", pickRandom(["2", "3", "4", "5", "6", "7"]), pickRandom(["2", "3", "4", "5", "6", "7"])];
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
      break;

    case "dry_king_high":
      ranks = ["K", pickRandom(["2", "3", "4", "5", "6", "7"]), pickRandom(["2", "3", "4", "5", "6", "7"])];
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
      break;

    case "dry_queen_high":
      ranks = ["Q", pickRandom(["2", "3", "4", "5", "6", "7"]), pickRandom(["2", "3", "4", "5", "6", "7"])];
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
      break;

    case "dry_low_rainbow":
      ranks = shuffleArray(["2", "3", "4", "5", "6", "7", "8", "9"] as Rank[]).slice(0, 3);
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
      break;

    case "paired_high": {
      const pairRank = pickRandom(["A", "K", "Q", "J"] as Rank[]);
      ranks = [pairRank, pairRank, pickRandom(["2", "3", "4", "5", "6", "7"] as Rank[])];
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
      break;
    }

    case "paired_low": {
      const pairRank = pickRandom(["2", "3", "4", "5", "6", "7"] as Rank[]);
      ranks = [pairRank, pairRank, pickRandom(["8", "9", "T"] as Rank[])];
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
      break;
    }

    case "wet_broadway": {
      const broadwayCards: Rank[] = ["T", "J", "Q", "K", "A"];
      const idx = Math.floor(Math.random() * 3);
      ranks = [broadwayCards[idx], broadwayCards[idx + 1], broadwayCards[idx + 2]];
      const s = pickRandom(allSuits);
      suits = [s, s, pickRandom(allSuits.filter(x => x !== s))];
      break;
    }

    case "wet_middle_connected": {
      const midCards: Rank[] = ["6", "7", "8", "9", "T", "J"];
      const idx = Math.floor(Math.random() * 4);
      ranks = [midCards[idx], midCards[idx + 1], midCards[idx + 2]];
      const s = pickRandom(allSuits);
      suits = [s, s, pickRandom(allSuits.filter(x => x !== s))];
      break;
    }

    case "wet_low_connected": {
      const lowCards: Rank[] = ["2", "3", "4", "5", "6", "7", "8"];
      const idx = Math.floor(Math.random() * 5);
      ranks = [lowCards[idx], lowCards[idx + 1], lowCards[idx + 2]];
      const s = pickRandom(allSuits);
      suits = [s, s, pickRandom(allSuits.filter(x => x !== s))];
      break;
    }

    case "monotone": {
      ranks = shuffleArray(allRanks).slice(0, 3);
      const s = pickRandom(allSuits);
      suits = [s, s, s];
      break;
    }

    case "twotone_dry": {
      ranks = [pickRandom(["A", "K", "Q"] as Rank[]), pickRandom(["2", "3", "4", "5"] as Rank[]), pickRandom(["7", "8", "9"] as Rank[])];
      const s = pickRandom(allSuits);
      suits = [s, s, pickRandom(allSuits.filter(x => x !== s))];
      break;
    }

    case "twotone_wet": {
      const midCards: Rank[] = ["7", "8", "9", "T", "J"];
      const idx = Math.floor(Math.random() * 3);
      ranks = [midCards[idx], midCards[idx + 1], midCards[idx + 2]];
      const s = pickRandom(allSuits);
      suits = [s, s, pickRandom(allSuits.filter(x => x !== s))];
      break;
    }

    default:
      ranks = shuffleArray(allRanks).slice(0, 3);
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
  }

  // Ensure unique ranks for non-paired textures
  if (!texture.includes("paired")) {
    const uniqueRanks = [...new Set(ranks)];
    if (uniqueRanks.length < 3) {
      return generateFlopOfTexture(texture); // Retry
    }
  }

  return { ranks, suits };
}

/**
 * Get texture info for display
 */
export function getTextureInfo(texture: FlopTextureType): FlopTextureCategory {
  return FLOP_TEXTURE_CATEGORIES[texture];
}

/**
 * Get all texture types as array for selection
 */
export function getAllTextureTypes(): FlopTextureCategory[] {
  return Object.values(FLOP_TEXTURE_CATEGORIES);
}
