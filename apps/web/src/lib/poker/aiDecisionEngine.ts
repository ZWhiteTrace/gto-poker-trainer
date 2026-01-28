// ============================================
// AI Decision Engine - Multiple AI Styles
// ============================================

import type { Card, Position, ActionType, Street, AIStyle } from "./types";

// ============================================
// AI Profiles
// ============================================

export interface AIPlayerProfile {
  id: string;
  name: string;
  nameZh: string;
  style: AIStyle;
  description: string;
  descriptionZh: string;
  avatar: string; // emoji
  // Tendencies (0-1 scale, 0.5 = GTO baseline)
  vpip: number;        // Voluntarily put $ in pot (0.2 = tight, 0.5 = normal, 0.8 = loose)
  pfr: number;         // Preflop raise frequency
  aggression: number;  // Postflop aggression (0.3 = passive, 0.5 = balanced, 0.8 = aggressive)
  bluffFreq: number;   // Bluff frequency
  foldToBet: number;   // Fold to bet frequency
  threeBetFreq: number; // 3-bet frequency
}

export const AI_PROFILES: AIPlayerProfile[] = [
  {
    id: "gto-bot",
    name: "GTO Bot",
    nameZh: "GTO 機器人",
    style: "GTO",
    description: "Plays near-optimal GTO strategy",
    descriptionZh: "接近最優 GTO 策略",
    avatar: "🤖",
    vpip: 0.5,
    pfr: 0.5,
    aggression: 0.5,
    bluffFreq: 0.5,
    foldToBet: 0.5,
    threeBetFreq: 0.5,
  },
  {
    id: "lag-larry",
    name: "LAG Larry",
    nameZh: "激進拉里",
    style: "LAG",
    description: "Loose-Aggressive: plays many hands aggressively",
    descriptionZh: "鬆凶型：玩很多牌，非常激進",
    avatar: "🔥",
    vpip: 0.75,
    pfr: 0.7,
    aggression: 0.8,
    bluffFreq: 0.7,
    foldToBet: 0.3,
    threeBetFreq: 0.7,
  },
  {
    id: "tag-tony",
    name: "TAG Tony",
    nameZh: "緊凶東尼",
    style: "TAG",
    description: "Tight-Aggressive: plays few hands but aggressively",
    descriptionZh: "緊凶型：只玩好牌，但玩得很凶",
    avatar: "🦈",
    vpip: 0.3,
    pfr: 0.6,
    aggression: 0.7,
    bluffFreq: 0.4,
    foldToBet: 0.4,
    threeBetFreq: 0.6,
  },
  {
    id: "passive-pete",
    name: "Passive Pete",
    nameZh: "被動乙乙",
    style: "Loose_Passive",
    description: "Calling station: calls too much, rarely raises",
    descriptionZh: "跟注站：什麼都跟，很少加注",
    avatar: "🐟",
    vpip: 0.7,
    pfr: 0.2,
    aggression: 0.2,
    bluffFreq: 0.1,
    foldToBet: 0.2,
    threeBetFreq: 0.15,
  },
  {
    id: "nit-nancy",
    name: "Nit Nancy",
    nameZh: "緊被南西",
    style: "Tight_Passive",
    description: "Only plays premium hands, folds to aggression",
    descriptionZh: "只玩超強牌，遇到加注就棄牌",
    avatar: "🐢",
    vpip: 0.15,
    pfr: 0.3,
    aggression: 0.3,
    bluffFreq: 0.1,
    foldToBet: 0.7,
    threeBetFreq: 0.2,
  },
  {
    id: "maniac-mike",
    name: "Maniac Mike",
    nameZh: "瘋狂麥克",
    style: "Maniac",
    description: "Crazy aggressive: raises and bluffs constantly",
    descriptionZh: "瘋狂型：不停加注和詐唬",
    avatar: "🃏",
    vpip: 0.85,
    pfr: 0.8,
    aggression: 0.9,
    bluffFreq: 0.8,
    foldToBet: 0.25,
    threeBetFreq: 0.8,
  },
];

export function getAIProfile(id: string): AIPlayerProfile {
  return AI_PROFILES.find(p => p.id === id) || AI_PROFILES[0];
}

export function getProfileByStyle(style: AIStyle): AIPlayerProfile {
  return AI_PROFILES.find(p => p.style === style) || AI_PROFILES[0];
}

// ============================================
// Hand Notation
// ============================================

function getHandNotation(cards: [Card, Card]): string {
  const [c1, c2] = cards;
  const r1 = c1.rank;
  const r2 = c2.rank;
  const suited = c1.suit === c2.suit;

  const rankOrder = "AKQJT98765432";
  const r1Index = rankOrder.indexOf(r1);
  const r2Index = rankOrder.indexOf(r2);

  const highRank = r1Index <= r2Index ? r1 : r2;
  const lowRank = r1Index <= r2Index ? r2 : r1;

  if (r1 === r2) return `${r1}${r2}`;
  return `${highRank}${lowRank}${suited ? "s" : "o"}`;
}

// ============================================
// GTO Baseline Ranges
// ============================================

const RFI_RANGES: Record<Position, Set<string>> = {
  UTG: new Set([
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55",
    "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    "KQs", "KJs", "KTs", "K9s", "QJs", "QTs", "JTs", "J9s", "T9s", "98s", "87s", "76s", "65s",
    "AKo", "AQo", "AJo", "ATo", "KQo",
  ]),
  MP: new Set([
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44",
    "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    "KQs", "KJs", "KTs", "K9s", "K8s", "QJs", "QTs", "Q9s", "JTs", "J9s", "T9s", "T8s",
    "98s", "87s", "76s", "65s", "54s",
    "AKo", "AQo", "AJo", "ATo", "KQo", "KJo",
  ]),
  CO: new Set([
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
    "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s",
    "QJs", "QTs", "Q9s", "Q8s", "JTs", "J9s", "J8s", "T9s", "T8s",
    "98s", "97s", "87s", "86s", "76s", "75s", "65s", "64s", "54s", "53s",
    "AKo", "AQo", "AJo", "ATo", "A9o", "KQo", "KJo", "KTo", "QJo", "QTo", "JTo",
  ]),
  BTN: new Set([
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
    "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
    "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s",
    "JTs", "J9s", "J8s", "J7s", "T9s", "T8s", "T7s",
    "98s", "97s", "96s", "87s", "86s", "85s", "76s", "75s", "74s", "65s", "64s", "54s", "53s", "43s",
    "AKo", "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o",
    "KQo", "KJo", "KTo", "K9o", "QJo", "QTo", "Q9o", "JTo", "J9o", "T9o", "T8o", "98o",
  ]),
  SB: new Set([
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
    "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
    "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s",
    "JTs", "J9s", "J8s", "J7s", "J6s", "T9s", "T8s", "T7s", "T6s",
    "98s", "97s", "96s", "87s", "86s", "85s", "76s", "75s", "74s",
    "65s", "64s", "63s", "54s", "53s", "52s", "43s", "42s", "32s",
    "AKo", "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
    "KQo", "KJo", "KTo", "K9o", "K8o", "K7o",
    "QJo", "QTo", "Q9o", "Q8o", "JTo", "J9o", "J8o", "T9o", "T8o", "98o", "97o", "87o", "76o",
  ]),
  BB: new Set([]),
};

const PREMIUM_HANDS = new Set(["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs"]);
const STRONG_HANDS = new Set(["99", "88", "77", "AQo", "AJs", "ATs", "KQs", "KJs", "QJs"]);
const PLAYABLE_HANDS = new Set([
  "66", "55", "44", "33", "22", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
  "KTs", "K9s", "QTs", "Q9s", "JTs", "J9s", "T9s", "98s", "87s", "76s", "65s", "54s",
  "AJo", "ATo", "KQo", "KJo", "QJo",
]);

// ============================================
// Decision Logic
// ============================================

interface AIDecision {
  action: ActionType;
  amount?: number;
  confidence: number;
  reasoning: string;
}

interface GameContext {
  position: Position;
  holeCards: [Card, Card];
  street: Street;
  pot: number;
  currentBet: number;
  playerBet: number;
  stack: number;
  numActivePlayers: number;
  lastAggressor: Position | null;
  hasRaiseInFront: boolean;
  communityCards: Card[];
}

/**
 * Main AI decision function with style modifier
 */
export function getAIDecision(
  context: GameContext,
  profile: AIPlayerProfile = AI_PROFILES[0]
): AIDecision {
  const { street, holeCards } = context;
  const handNotation = getHandNotation(holeCards);

  if (street === "preflop") {
    return getPreflopDecision(context, handNotation, profile);
  } else {
    return getPostflopDecision(context, handNotation, profile);
  }
}

/**
 * Preflop decision with style adjustments
 */
function getPreflopDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile
): AIDecision {
  const { position, currentBet, playerBet, stack, hasRaiseInFront, lastAggressor } = context;
  const toCall = currentBet - playerBet;

  const isPremium = PREMIUM_HANDS.has(handNotation);
  const isStrong = STRONG_HANDS.has(handNotation);
  const isPlayable = PLAYABLE_HANDS.has(handNotation);

  // Adjust open range based on VPIP
  const shouldOpen = shouldPlayHand(handNotation, position, profile.vpip);

  // No raise in front - consider opening
  if (!hasRaiseInFront && currentBet <= 1) {
    if (shouldOpen) {
      // Adjust raise size based on aggression
      const baseRaise = position === "BTN" ? 2.5 : position === "SB" ? 3 : 2.2;
      const raiseSize = baseRaise * (0.8 + profile.aggression * 0.4);

      return {
        action: "raise",
        amount: Math.min(raiseSize, stack),
        confidence: 0.85,
        reasoning: `Opening ${handNotation} from ${position}`,
      };
    }

    // BB can check
    if (position === "BB" && toCall === 0) {
      return {
        action: "check",
        confidence: 0.8,
        reasoning: "Checking in BB",
      };
    }

    return {
      action: "fold",
      confidence: 0.8,
      reasoning: `Folding ${handNotation} from ${position}`,
    };
  }

  // Facing a raise
  if (hasRaiseInFront) {
    // 3-bet decision based on profile
    const should3Bet = decide3Bet(handNotation, profile, isPremium, isStrong);

    if (should3Bet) {
      const threeBetSize = currentBet * (2.5 + profile.aggression);
      return {
        action: "raise",
        amount: Math.min(threeBetSize, stack),
        confidence: 0.8,
        reasoning: `3-betting ${handNotation}`,
      };
    }

    // Call decision
    const shouldCall = decideCall(handNotation, profile, isPremium, isStrong, isPlayable, toCall, stack);

    if (shouldCall) {
      return {
        action: "call",
        confidence: 0.75,
        reasoning: `Calling with ${handNotation}`,
      };
    }

    // Fold based on fold-to-bet tendency
    return {
      action: "fold",
      confidence: profile.foldToBet,
      reasoning: `Folding ${handNotation} to raise`,
    };
  }

  return { action: "fold", confidence: 0.5, reasoning: "Default fold" };
}

/**
 * Postflop decision with style adjustments
 */
function getPostflopDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile
): AIDecision {
  const { pot, currentBet, playerBet, stack, communityCards } = context;
  const toCall = currentBet - playerBet;
  const handStrength = estimateHandStrength(context.holeCards, communityCards);

  // No bet to face
  if (toCall === 0) {
    // Strong hand - bet for value
    if (handStrength > 0.65) {
      const betSize = pot * (0.4 + profile.aggression * 0.4);
      return {
        action: "bet",
        amount: Math.min(betSize, stack),
        confidence: 0.85,
        reasoning: "Value betting strong hand",
      };
    }

    // Medium hand - depends on style
    if (handStrength > 0.35) {
      const betProb = profile.aggression * 0.6;
      if (Math.random() < betProb) {
        const betSize = pot * (0.3 + profile.aggression * 0.2);
        return {
          action: "bet",
          amount: Math.min(betSize, stack),
          confidence: 0.6,
          reasoning: "Betting medium hand",
        };
      }
      return { action: "check", confidence: 0.7, reasoning: "Checking medium hand" };
    }

    // Weak hand - bluff based on bluff frequency
    if (Math.random() < profile.bluffFreq * 0.3) {
      const betSize = pot * (0.5 + Math.random() * 0.25);
      return {
        action: "bet",
        amount: Math.min(betSize, stack),
        confidence: 0.5,
        reasoning: "Bluffing with air",
      };
    }

    return { action: "check", confidence: 0.8, reasoning: "Checking weak hand" };
  }

  // Facing a bet
  const potOdds = toCall / (pot + toCall);

  // Very strong - raise
  if (handStrength > 0.85) {
    const raiseProb = 0.5 + profile.aggression * 0.4;
    if (Math.random() < raiseProb) {
      const raiseSize = currentBet * (2 + profile.aggression);
      return {
        action: "raise",
        amount: Math.min(raiseSize, stack + playerBet),
        confidence: 0.9,
        reasoning: "Raising for value",
      };
    }
    return { action: "call", confidence: 0.9, reasoning: "Slowplaying strong hand" };
  }

  // Strong - mostly call, sometimes raise
  if (handStrength > 0.6) {
    if (Math.random() < profile.aggression * 0.4) {
      const raiseSize = currentBet * 2.5;
      return {
        action: "raise",
        amount: Math.min(raiseSize, stack + playerBet),
        confidence: 0.75,
        reasoning: "Raising strong hand",
      };
    }
    return { action: "call", confidence: 0.8, reasoning: "Calling with strong hand" };
  }

  // Medium - call if pot odds are right, adjusted by style
  if (handStrength > 0.35) {
    const adjustedOdds = potOdds * (0.7 + profile.foldToBet * 0.6);
    if (handStrength > adjustedOdds) {
      return { action: "call", confidence: 0.65, reasoning: "Calling with odds" };
    }
  }

  // Weak - fold or bluff raise
  if (Math.random() < profile.bluffFreq * 0.15 && toCall < pot * 0.5) {
    const raiseSize = currentBet * 2.5;
    return {
      action: "raise",
      amount: Math.min(raiseSize, stack + playerBet),
      confidence: 0.4,
      reasoning: "Bluff raising",
    };
  }

  // Fold based on tendency
  if (Math.random() < profile.foldToBet) {
    return { action: "fold", confidence: 0.75, reasoning: "Folding to bet" };
  }

  // Passive players call more
  if (profile.aggression < 0.4 && toCall < pot * 0.5) {
    return { action: "call", confidence: 0.5, reasoning: "Calling as station" };
  }

  return { action: "fold", confidence: 0.7, reasoning: "Folding weak hand" };
}

// ============================================
// Helper Functions
// ============================================

function shouldPlayHand(hand: string, position: Position, vpip: number): boolean {
  const baseRange = RFI_RANGES[position] || new Set();

  // GTO baseline
  if (baseRange.has(hand)) return true;

  // Loose players play more hands
  if (vpip > 0.6) {
    if (PLAYABLE_HANDS.has(hand)) return Math.random() < (vpip - 0.5) * 2;
    // Very loose players play almost anything
    if (vpip > 0.75) return Math.random() < 0.3;
  }

  // Tight players play fewer hands
  if (vpip < 0.4) {
    if (!PREMIUM_HANDS.has(hand) && !STRONG_HANDS.has(hand)) {
      return Math.random() < vpip;
    }
  }

  return false;
}

function decide3Bet(
  hand: string,
  profile: AIPlayerProfile,
  isPremium: boolean,
  isStrong: boolean
): boolean {
  // Always 3-bet premiums
  if (isPremium) return Math.random() < (0.7 + profile.threeBetFreq * 0.3);

  // Strong hands based on 3-bet frequency
  if (isStrong) return Math.random() < profile.threeBetFreq * 0.6;

  // Bluff 3-bets for aggressive players
  if (profile.threeBetFreq > 0.6) {
    return Math.random() < profile.bluffFreq * 0.2;
  }

  return false;
}

function decideCall(
  hand: string,
  profile: AIPlayerProfile,
  isPremium: boolean,
  isStrong: boolean,
  isPlayable: boolean,
  toCall: number,
  stack: number
): boolean {
  // Always call premiums
  if (isPremium) return true;

  // Strong hands - usually call
  if (isStrong) return Math.random() < (0.8 - profile.foldToBet * 0.3);

  // Playable hands - depends on style
  if (isPlayable) {
    const callProb = profile.vpip * 0.8 * (1 - profile.foldToBet * 0.5);
    return Math.random() < callProb;
  }

  // Passive players call too much
  if (profile.aggression < 0.3 && toCall < stack * 0.1) {
    return Math.random() < 0.4;
  }

  return false;
}

function estimateHandStrength(holeCards: [Card, Card], communityCards: Card[]): number {
  const allCards = [...holeCards, ...communityCards];
  const rankCounts = new Map<string, number>();
  const suitCounts = new Map<string, number>();

  for (const card of allCards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  }

  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const maxSuit = Math.max(...Array.from(suitCounts.values()));

  if (counts[0] >= 4) return 0.98;
  if (counts[0] >= 3 && counts[1] >= 2) return 0.95;
  if (maxSuit >= 5) return 0.88;

  const rankValues = allCards.map(c => "AKQJT98765432".indexOf(c.rank)).sort((a, b) => a - b);
  const uniqueRanks = [...new Set(rankValues)];
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) return 0.82;
  }

  if (counts[0] >= 3) return 0.75;
  if (counts[0] >= 2 && counts[1] >= 2) return 0.6;

  if (counts[0] >= 2) {
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count >= 2)?.[0];
    if (pairRank && communityCards.length > 0) {
      const boardHighCard = communityCards.reduce((max, c) =>
        "AKQJT98765432".indexOf(c.rank) < "AKQJT98765432".indexOf(max.rank) ? c : max
      );
      if (pairRank === boardHighCard.rank) return 0.5;
      return 0.35;
    }
    return 0.4;
  }

  const highCard = holeCards.reduce((max, c) =>
    "AKQJT98765432".indexOf(c.rank) < "AKQJT98765432".indexOf(max.rank) ? c : max
  );
  const highCardValue = 14 - "AKQJT98765432".indexOf(highCard.rank);
  return 0.1 + (highCardValue / 14) * 0.2;
}

export { getHandNotation };
