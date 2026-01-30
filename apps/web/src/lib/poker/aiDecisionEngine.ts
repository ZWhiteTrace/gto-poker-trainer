// ============================================
// AI Decision Engine v2.0
// Uses GTO range tables with player style adjustments
// ============================================

import type { Card, Position, ActionType, Street, AIStyle, Rank } from "./types";
import type { PlayerStats } from "./playerStats";
import { getPlayerVPIP } from "./playerStats";
import { evaluateHand } from "./handEvaluator";

// ============================================
// Import GTO Range Data (will be loaded dynamically)
// ============================================

// Static imports for the range data
import rfiData from "@data/ranges/6max/rfi_frequencies.json";
import vsRfiData from "@data/ranges/6max/vs_rfi_frequencies.json";
import vs3betData from "@data/ranges/6max/vs_3bet_frequencies.json";
import vs4betData from "@data/ranges/6max/vs_4bet_frequencies.json";

type RFIFrequencies = Record<string, { raise?: number; fold?: number }>;
type VsRFIFrequencies = Record<string, { "3bet"?: number; call?: number; fold?: number }>;
type Vs3BetFrequencies = Record<string, { "4bet"?: number; call?: number; fold?: number }>;
type Vs4BetFrequencies = Record<string, { "5bet"?: number; call?: number; fold?: number }>;

// Position mapping (now unified - both frontend and JSON use same names)
const POSITION_MAP: Record<Position, string> = {
  UTG: "UTG",
  HJ: "HJ",
  CO: "CO",
  BTN: "BTN",
  SB: "SB",
  BB: "BB",
};

// ============================================
// AI Profiles with Realistic Statistics
// Based on real player pool data from NL50-NL200
// ============================================

export interface AIPlayerProfile {
  id: string;
  name: string;
  nameZh: string;
  style: AIStyle;
  description: string;
  descriptionZh: string;
  avatar: string;
  // Realistic tendencies based on real player pools
  vpip: number;        // Voluntarily Put $ In Pot (0.11-0.60 realistic range)
  pfr: number;         // Preflop Raise Frequency
  aggression: number;  // Postflop aggression factor (0.3-3.0 realistic)
  bluffFreq: number;   // Bluff frequency (0.1-0.5)
  foldToBet: number;   // Fold to C-bet frequency
  threeBetFreq: number; // 3-bet frequency (0.02-0.12 realistic)
  fourBetFreq: number;  // 4-bet frequency
  foldTo3Bet: number;   // Fold to 3-bet frequency
  cbetFreq: number;     // C-bet frequency
  foldToCbet: number;   // Fold to C-bet frequency
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
    // GTO baseline stats
    vpip: 0.24,
    pfr: 0.20,
    aggression: 0.5,
    bluffFreq: 0.33,
    foldToBet: 0.45,
    threeBetFreq: 0.08,
    fourBetFreq: 0.03,
    foldTo3Bet: 0.55,
    cbetFreq: 0.65,
    foldToCbet: 0.45,
  },
  {
    id: "lag-larry",
    name: "LAG Larry",
    nameZh: "激進拉里",
    style: "LAG",
    description: "Loose-Aggressive: plays many hands aggressively",
    descriptionZh: "鬆凶型：玩很多牌，非常激進",
    avatar: "🔥",
    // LAG stats: VPIP 28-32%, PFR 22-26%, 3bet 10-12%
    vpip: 0.30,
    pfr: 0.24,
    aggression: 0.7,
    bluffFreq: 0.45,
    foldToBet: 0.30,
    threeBetFreq: 0.11,
    fourBetFreq: 0.05,
    foldTo3Bet: 0.40,
    cbetFreq: 0.75,
    foldToCbet: 0.35,
  },
  {
    id: "tag-tony",
    name: "TAG Tony",
    nameZh: "緊凶東尼",
    style: "TAG",
    description: "Tight-Aggressive: plays few hands but aggressively",
    descriptionZh: "緊凶型：只玩好牌，但玩得很凶",
    avatar: "🦈",
    // TAG stats: VPIP 19-22%, PFR 16-19%, 3bet 7-9%
    vpip: 0.21,
    pfr: 0.18,
    aggression: 0.6,
    bluffFreq: 0.30,
    foldToBet: 0.40,
    threeBetFreq: 0.08,
    fourBetFreq: 0.03,
    foldTo3Bet: 0.55,
    cbetFreq: 0.70,
    foldToCbet: 0.42,
  },
  {
    id: "passive-pete",
    name: "Passive Pete",
    nameZh: "被動乙乙",
    style: "Loose_Passive",
    description: "Calling station: calls too much, rarely raises",
    descriptionZh: "跟注站：什麼都跟，很少加注",
    avatar: "🐟",
    // Calling station stats: VPIP 45-55%, PFR 8-12%, rarely 3bets
    vpip: 0.48,
    pfr: 0.10,
    aggression: 0.25,
    bluffFreq: 0.10,
    foldToBet: 0.20,
    threeBetFreq: 0.03,
    fourBetFreq: 0.01,
    foldTo3Bet: 0.70,
    cbetFreq: 0.40,
    foldToCbet: 0.25,
  },
  {
    id: "nit-nancy",
    name: "Nit Nancy",
    nameZh: "緊被南西",
    style: "Tight_Passive",
    description: "Only plays premium hands, folds to aggression",
    descriptionZh: "只玩超強牌，遇到加注就棄牌",
    avatar: "🐢",
    // Nit stats: VPIP 11-15%, PFR 8-12%, folds to everything
    vpip: 0.13,
    pfr: 0.10,
    aggression: 0.35,
    bluffFreq: 0.08,
    foldToBet: 0.70,
    threeBetFreq: 0.04,
    fourBetFreq: 0.02,
    foldTo3Bet: 0.75,
    cbetFreq: 0.55,
    foldToCbet: 0.55,
  },
  {
    id: "maniac-mike",
    name: "Maniac Mike",
    nameZh: "瘋狂麥克",
    style: "Maniac",
    description: "Crazy aggressive: raises and bluffs constantly",
    descriptionZh: "瘋狂型：不停加注和詐唬",
    avatar: "🃏",
    // Maniac stats: VPIP 55%+, PFR 35%+, 3bets everything
    vpip: 0.58,
    pfr: 0.38,
    aggression: 0.85,
    bluffFreq: 0.55,
    foldToBet: 0.25,
    threeBetFreq: 0.15,
    fourBetFreq: 0.08,
    foldTo3Bet: 0.30,
    cbetFreq: 0.85,
    foldToCbet: 0.20,
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
// GTO Range Lookups
// ============================================

function getRFIFrequency(position: Position, hand: string): { raise: number } | null {
  const jsonPosition = POSITION_MAP[position];
  const positionData = (rfiData as Record<string, { frequencies?: RFIFrequencies }>)[jsonPosition];

  if (!positionData?.frequencies) return null;
  const handData = positionData.frequencies[hand];

  if (!handData) return null;
  return { raise: handData.raise || 0 };
}

function getVsRFIFrequency(
  ourPosition: Position,
  openerPosition: Position,
  hand: string
): { threeBet: number; call: number; fold: number } | null {
  const ourJsonPos = POSITION_MAP[ourPosition];
  const openerJsonPos = POSITION_MAP[openerPosition];
  const key = `${ourJsonPos}_vs_${openerJsonPos}`;

  const matchupData = (vsRfiData as Record<string, { frequencies?: VsRFIFrequencies }>)[key];
  if (!matchupData?.frequencies) return null;

  const handData = matchupData.frequencies[hand];
  if (!handData) return null;

  return {
    threeBet: handData["3bet"] || 0,
    call: handData.call || 0,
    fold: handData.fold || 100 - (handData["3bet"] || 0) - (handData.call || 0),
  };
}

function getVs3BetFrequency(
  ourPosition: Position,
  threeBetterPosition: Position,
  hand: string
): { fourBet: number; call: number; fold: number } | null {
  const ourJsonPos = POSITION_MAP[ourPosition];
  const threeBetterJsonPos = POSITION_MAP[threeBetterPosition];
  const key = `${ourJsonPos}_vs_${threeBetterJsonPos}`;

  const matchupData = (vs3betData as Record<string, { frequencies?: Vs3BetFrequencies }>)[key];
  if (!matchupData?.frequencies) return null;

  const handData = matchupData.frequencies[hand];
  if (!handData) return null;

  return {
    fourBet: handData["4bet"] || 0,
    call: handData.call || 0,
    fold: handData.fold || 100 - (handData["4bet"] || 0) - (handData.call || 0),
  };
}

function getVs4BetFrequency(
  ourPosition: Position,
  fourBetterPosition: Position,
  hand: string
): { fiveBet: number; call: number; fold: number } | null {
  const ourJsonPos = POSITION_MAP[ourPosition];
  const fourBetterJsonPos = POSITION_MAP[fourBetterPosition];
  const key = `${ourJsonPos}_vs_${fourBetterJsonPos}`;

  const matchupData = (vs4betData as Record<string, { frequencies?: Vs4BetFrequencies }>)[key];
  if (!matchupData?.frequencies) return null;

  const handData = matchupData.frequencies[hand];
  if (!handData) return null;

  return {
    fiveBet: handData["5bet"] || 0,
    call: handData.call || 0,
    fold: handData.fold || 100 - (handData["5bet"] || 0) - (handData.call || 0),
  };
}

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
  preflopRaiseCount?: number;
  communityCards: Card[];
  isAllInSituation?: boolean;
  // New fields for improved postflop logic
  isInPosition?: boolean;           // Is AI in position vs remaining players
  villainChecked?: boolean;         // Did villain check to us (for probe betting)
  wasLastStreetAggressor?: boolean; // Were we the aggressor on previous street
  preflopAggressor?: Position;      // Who raised preflop (for c-bet logic)
}

/**
 * Main AI decision function that determines the optimal action for an AI player.
 * Uses GTO range data with player style adjustments for realistic decision making.
 *
 * @param context - Current game state including position, cards, betting info
 * @param profile - AI player profile defining play style and tendencies
 * @param heroStats - Optional hero player statistics for AI adaptation
 * @returns AIDecision containing action type and optional bet amount
 *
 * @example
 * ```ts
 * const decision = getAIDecision({
 *   position: "BTN",
 *   holeCards: [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
 *   street: "preflop",
 *   pot: 1.5,
 *   currentBet: 1,
 *   playerBet: 0,
 *   stack: 100,
 *   communityCards: [],
 * }, AI_PROFILES[0], heroStats);
 * ```
 */
export function getAIDecision(
  context: GameContext,
  profile: AIPlayerProfile = AI_PROFILES[0],
  heroStats?: PlayerStats
): AIDecision {
  const { street, holeCards, currentBet, playerBet, stack } = context;
  const handNotation = getHandNotation(holeCards);
  const toCall = currentBet - playerBet;

  // Adapt profile based on hero stats (if available and enough sample size)
  const adaptedProfile = heroStats && heroStats.handsPlayed >= 10
    ? adaptProfileToHero(profile, heroStats)
    : profile;

  // Check if we're facing an all-in
  if (toCall >= stack) {
    return getAllInResponse(context, handNotation, adaptedProfile);
  }

  if (street === "preflop") {
    return getPreflopDecision(context, handNotation, adaptedProfile);
  } else {
    return getPostflopDecision(context, handNotation, adaptedProfile);
  }
}

/**
 * Adapt AI profile based on hero's playing tendencies.
 * If hero plays too loose, AI increases 3-bet frequency.
 * If hero plays too tight, AI increases steal frequency.
 */
function adaptProfileToHero(
  profile: AIPlayerProfile,
  heroStats: PlayerStats
): AIPlayerProfile {
  const heroVPIP = getPlayerVPIP(heroStats);
  const adapted = { ...profile };

  // If hero plays too loose (VPIP > 35%), AI 3-bets more aggressively
  if (heroVPIP > 0.35) {
    adapted.threeBetFreq = Math.min(0.18, profile.threeBetFreq * 1.3);
  }

  // If hero plays too tight (VPIP < 15%), AI steals more
  if (heroVPIP < 0.15) {
    adapted.vpip = Math.min(0.40, profile.vpip * 1.2);
    adapted.pfr = Math.min(0.35, profile.pfr * 1.2);
  }

  return adapted;
}

/**
 * Handle all-in situations
 */
function getAllInResponse(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile
): AIDecision {
  const { pot, currentBet, playerBet, stack, communityCards } = context;
  const toCall = Math.min(currentBet - playerBet, stack);
  const potOdds = toCall / (pot + toCall);

  // Calculate hand strength
  const opponents = Math.max(1, context.numActivePlayers - 1);
  const handStrength = communityCards.length > 0
    ? estimateHandStrengthVsOpponents(context.holeCards, communityCards, opponents)
    : estimatePreflopStrength(handNotation);

  // Required equity to call (with style adjustment)
  const requiredEquity = potOdds * (0.8 + profile.foldToBet * 0.4);

  if (handStrength >= requiredEquity) {
    return {
      action: "call",
      amount: toCall,
      confidence: handStrength,
      reasoning: `Calling all-in with ${handNotation} (${Math.round(handStrength * 100)}% equity vs ${Math.round(potOdds * 100)}% pot odds)`,
    };
  }

  return {
    action: "fold",
    confidence: 1 - handStrength,
    reasoning: `Folding to all-in with ${handNotation} (${Math.round(handStrength * 100)}% equity < ${Math.round(requiredEquity * 100)}% required)`,
  };
}

/**
 * Preflop decision using GTO ranges with style adjustments
 */
function getPreflopDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile
): AIDecision {
  const { position, currentBet, playerBet, stack, hasRaiseInFront, lastAggressor, pot, preflopRaiseCount = 0 } = context;
  const toCall = currentBet - playerBet;

  // No raise in front - consider opening (RFI)
  if (!hasRaiseInFront && currentBet <= 1) {
    return getRFIDecision(context, handNotation, profile);
  }

  // Facing a raise - check if it's a 3bet situation or RFI response
  if (hasRaiseInFront && lastAggressor) {
    // Check if we already raised (facing 3bet)
    if (playerBet > 1) {
      // If there have been 3+ raises preflop, we're facing a 4-bet
      if (preflopRaiseCount >= 3) {
        return getVs4BetDecision(context, handNotation, profile, lastAggressor);
      }
      return getVs3BetDecision(context, handNotation, profile, lastAggressor);
    }
    // We haven't acted yet, this is our response to RFI
    return getVsRFIDecision(context, handNotation, profile, lastAggressor);
  }

  // BB special case - check or respond
  if (position === "BB" && toCall === 0) {
    return { action: "check", confidence: 0.8, reasoning: "Checking in BB" };
  }

  return { action: "fold", confidence: 0.6, reasoning: `Folding ${handNotation}` };
}

/**
 * RFI (Raise First In) decision
 */
function getRFIDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile
): AIDecision {
  const { position, stack, playerBet } = context;

  // Get GTO frequency for this hand
  const gtoFreq = getRFIFrequency(position, handNotation);

  // Calculate adjusted open frequency based on VPIP/PFR
  let openProb = 0;

  if (gtoFreq && gtoFreq.raise > 0) {
    // Hand is in GTO range - use GTO frequency as base
    const gtoRaiseProb = gtoFreq.raise / 100;

    // For 100% raise hands, ALWAYS raise (no variance)
    if (gtoFreq.raise >= 100) {
      openProb = 1.0;
    } else {
      // For mixed frequency hands, adjust based on profile
      // Looser players open more, tighter players open less
      const vpipMultiplier = profile.vpip / 0.24; // Normalized to GTO baseline
      openProb = Math.min(1.0, gtoRaiseProb * vpipMultiplier);
    }
  } else {
    // Hand is not in GTO range - adjust based on VPIP
    // LAGs and maniacs open wider
    const vpipAdjustment = (profile.vpip - 0.24) * 2; // How much looser than GTO
    const handStrength = estimatePreflopStrength(handNotation);

    if (vpipAdjustment > 0 && handStrength > 0.3) {
      openProb = vpipAdjustment * handStrength;
    }
  }

  // BB can always check
  if (position === "BB" && context.currentBet <= 1) {
    return { action: "check", confidence: 0.8, reasoning: "Checking BB option" };
  }

  // Decision based on probability
  if (Math.random() < openProb) {
    // Calculate raise size based on position (rounded to 0.5 BB)
    const positionSizes: Record<Position, number> = {
      UTG: 2.5,
      HJ: 2.5,
      CO: 2.5,
      BTN: 2.5,
      SB: 3.0,
      BB: 3.0,
    };
    const baseSize = positionSizes[position] || 2.5;
    // Round to 0.5 BB
    const raiseSize = Math.round(baseSize * (0.9 + profile.aggression * 0.2) * 2) / 2;

    return {
      action: "raise",
      amount: Math.min(raiseSize, stack + playerBet),
      confidence: openProb,
      reasoning: `Opening ${handNotation} from ${position}`,
    };
  }

  // Fold or check
  if (position === "BB") {
    return { action: "check", confidence: 0.7, reasoning: "Checking BB" };
  }

  return { action: "fold", confidence: 1 - openProb, reasoning: `Folding ${handNotation} from ${position}` };
}

/**
 * Response to RFI (call/3bet/fold)
 */
function getVsRFIDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile,
  raiserPosition: Position
): AIDecision {
  const { position, currentBet, playerBet, stack, pot } = context;
  const toCall = currentBet - playerBet;

  // Get GTO frequencies
  const gtoFreq = getVsRFIFrequency(position, raiserPosition, handNotation);

  let threeBetProb = 0;
  let callProb = 0;

  if (gtoFreq) {
    // Use GTO frequencies as baseline
    const gto3bet = gtoFreq.threeBet / 100;
    const gtoCall = gtoFreq.call / 100;

    // For 100% action hands, respect GTO (no adjustments)
    if (gtoFreq.threeBet >= 100) {
      threeBetProb = 1.0;
      callProb = 0;
    } else if (gtoFreq.call >= 100) {
      threeBetProb = 0;
      callProb = 1.0;
    } else {
      // Mixed frequency - adjust based on player style
      const threeBetAdjust = profile.threeBetFreq / 0.08;
      threeBetProb = Math.min(1.0, gto3bet * threeBetAdjust);

      const callAdjust = profile.vpip / 0.24;
      callProb = Math.min(1.0 - threeBetProb, gtoCall * Math.min(callAdjust, 1.5));

      // Tighter players 3bet less
      if (profile.vpip < 0.20) {
        threeBetProb *= 0.7;
      }
    }
  } else {
    // Hand not in GTO range - base on player style
    const handStrength = estimatePreflopStrength(handNotation);

    // Very loose players might still play
    if (profile.vpip > 0.35 && handStrength > 0.2) {
      callProb = (profile.vpip - 0.35) * handStrength * 2;
    }

    // Maniacs 3bet light
    if (profile.threeBetFreq > 0.10 && handStrength > 0.4) {
      threeBetProb = (profile.threeBetFreq - 0.08) * handStrength;
    }
  }

  // Normalize probabilities
  const totalAction = threeBetProb + callProb;
  if (totalAction > 1) {
    threeBetProb /= totalAction;
    callProb /= totalAction;
  }

  const rand = Math.random();

  // 3-bet decision
  if (rand < threeBetProb) {
    // 3bet sizing: IP ~3x, OOP ~3.5-4x (rounded to 0.5 BB)
    const isIP = isInPosition(position, raiserPosition);
    const threeBetSize = Math.round(currentBet * (isIP ? 3 : 3.5) * 2) / 2;

    return {
      action: "raise",
      amount: Math.min(threeBetSize, stack + playerBet),
      confidence: threeBetProb,
      reasoning: `3-betting ${handNotation} vs ${raiserPosition}`,
    };
  }

  // Call decision
  if (rand < threeBetProb + callProb) {
    return {
      action: "call",
      confidence: callProb,
      reasoning: `Calling ${handNotation} vs ${raiserPosition}`,
    };
  }

  // Fold
  return {
    action: "fold",
    confidence: 1 - threeBetProb - callProb,
    reasoning: `Folding ${handNotation} vs ${raiserPosition} RFI`,
  };
}

/**
 * Response to 3bet (4bet/call/fold)
 */
function getVs3BetDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile,
  threeBetterPosition: Position
): AIDecision {
  const { position, currentBet, playerBet, stack } = context;

  // Get GTO frequencies
  const gtoFreq = getVs3BetFrequency(position, threeBetterPosition, handNotation);

  let fourBetProb = 0;
  let callProb = 0;

  if (gtoFreq) {
    fourBetProb = gtoFreq.fourBet / 100;
    callProb = gtoFreq.call / 100;

    // Adjust based on profile
    fourBetProb *= profile.fourBetFreq / 0.03;

    // Tighter players fold more to 3bets
    callProb *= (1 - profile.foldTo3Bet);
  } else {
    // Hand not in GTO 4bet/call range
    const handStrength = estimatePreflopStrength(handNotation);

    // Only call with decent equity
    if (profile.vpip > 0.30 && handStrength > 0.5) {
      callProb = 0.2;
    }
  }

  const rand = Math.random();

  if (rand < fourBetProb) {
    const fourBetSize = currentBet * 2.5;
    return {
      action: "raise",
      amount: Math.min(fourBetSize, stack + playerBet),
      confidence: fourBetProb,
      reasoning: `4-betting ${handNotation} vs ${threeBetterPosition}`,
    };
  }

  if (rand < fourBetProb + callProb) {
    return {
      action: "call",
      confidence: callProb,
      reasoning: `Calling 3bet with ${handNotation}`,
    };
  }

  return {
    action: "fold",
    confidence: 1 - fourBetProb - callProb,
    reasoning: `Folding ${handNotation} to 3bet`,
  };
}

/**
 * Response to 4bet (5bet/call/fold)
 */
function getVs4BetDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile,
  fourBetterPosition: Position
): AIDecision {
  const { position, stack, playerBet } = context;

  const gtoFreq = getVs4BetFrequency(position, fourBetterPosition, handNotation);

  let fiveBetProb = 0;
  let callProb = 0;

  if (gtoFreq) {
    fiveBetProb = gtoFreq.fiveBet / 100;
    callProb = gtoFreq.call / 100;

    // Adjust based on profile aggression (slightly more 5-bet for aggressive players)
    fiveBetProb *= Math.min(1.5, 0.8 + profile.aggression * 0.7);
    fiveBetProb = Math.min(1.0, fiveBetProb);
    // Tighter players call less vs 4bet
    if (profile.vpip < 0.20) {
      callProb *= 0.7;
    }
  } else {
    // Hand not in GTO range - occasional bluff 5bet for maniacs
    if (profile.fourBetFreq > 0.05 && estimatePreflopStrength(handNotation) > 0.75) {
      fiveBetProb = 0.1;
    }
  }

  const total = fiveBetProb + callProb;
  if (total > 1) {
    fiveBetProb /= total;
    callProb /= total;
  }

  const rand = Math.random();

  if (rand < fiveBetProb) {
    return {
      action: "allin",
      amount: stack + playerBet,
      confidence: fiveBetProb,
      reasoning: `5-betting (all-in) ${handNotation} vs ${fourBetterPosition}`,
    };
  }

  if (rand < fiveBetProb + callProb) {
    return {
      action: "call",
      confidence: callProb,
      reasoning: `Calling 4bet with ${handNotation}`,
    };
  }

  return {
    action: "fold",
    confidence: 1 - fiveBetProb - callProb,
    reasoning: `Folding ${handNotation} to 4bet`,
  };
}

/**
 * Postflop decision with board texture analysis
 * Now includes position awareness, check-raise logic, and street-specific adjustments
 */
function getPostflopDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile
): AIDecision {
  const { pot, currentBet, playerBet, stack, communityCards, street, isInPosition, villainChecked, wasLastStreetAggressor, preflopAggressor, position } = context;
  const toCall = currentBet - playerBet;

  const opponents = Math.max(1, context.numActivePlayers - 1);
  const handStrength = estimateHandStrengthVsOpponents(context.holeCards, communityCards, opponents);
  const boardTexture = analyzeBoardTexture(communityCards);

  // Determine if we were the preflop aggressor
  const isPreflopAggressor = preflopAggressor === position;

  // No bet to face - consider betting or checking
  if (toCall === 0) {
    // Check-raise opportunity: we're OOP, villain might bet
    if (!isInPosition && handStrength > 0.7 && Math.random() < profile.aggression * 0.25) {
      // Set up check-raise with strong hands OOP
      return { action: "check", confidence: 0.8, reasoning: "Setting up check-raise" };
    }

    // Probe betting: villain checked back on previous street, we're IP
    if (villainChecked && isInPosition && street !== "flop") {
      return getProbeBetDecision(context, handStrength, boardTexture, profile);
    }

    return getPostflopBetDecision(context, handStrength, boardTexture, profile, isPreflopAggressor);
  }

  // Facing a bet - call, raise, or fold
  // Check-raise execution: we checked with intention to raise
  if (!isInPosition && handStrength > 0.75) {
    const checkRaiseProb = profile.aggression * 0.4;
    if (Math.random() < checkRaiseProb) {
      const raiseSize = Math.round(currentBet * 3 * 2) / 2;
      return {
        action: "raise",
        amount: Math.min(raiseSize, stack + playerBet),
        confidence: 0.85,
        reasoning: "Check-raising for value",
      };
    }
  }

  return getFacingBetDecision(context, handStrength, boardTexture, profile, street);
}

/**
 * Decide whether to bet or check when facing no bet
 * Now with position awareness and preflop aggressor consideration
 */
function getPostflopBetDecision(
  context: GameContext,
  handStrength: number,
  boardTexture: BoardTexture,
  profile: AIPlayerProfile,
  isPreflopAggressor: boolean = false
): AIDecision {
  const { pot, stack, street, isInPosition } = context;

  // Base c-bet probability
  let betProb = profile.cbetFreq;

  // Adjust based on preflop aggressor status
  if (isPreflopAggressor) {
    // C-betting as preflop raiser
    betProb *= 1.2;
  } else {
    // Donk betting (betting into preflop raiser) - less frequent
    betProb *= 0.4;
  }

  // Position adjustment: IP can bet more liberally
  if (isInPosition) {
    betProb *= 1.15;
  } else {
    betProb *= 0.85;
  }

  // Street-specific adjustments
  if (street === "turn") {
    // Turn barrels should be more selective
    betProb *= 0.75;
  } else if (street === "river") {
    // River bets need to be even more polarized
    betProb *= 0.6;
    // But value bet more with strong hands
    if (handStrength > 0.8) betProb = Math.min(0.95, betProb * 1.8);
  }

  // Hand strength adjustments
  if (handStrength > 0.7) {
    betProb = Math.min(0.95, betProb + 0.3);
  } else if (handStrength > 0.4) {
    betProb *= (boardTexture.isDry ? 1.2 : 0.7);
  } else {
    // Bluffing - need good blockers or dry board
    betProb = profile.bluffFreq * (boardTexture.isDry ? 0.8 : 0.3);
  }

  if (Math.random() < betProb) {
    // Sizing based on street, board texture, and position
    let betMultiplier: number;

    if (street === "river") {
      // River sizing: polarized - larger bets
      betMultiplier = handStrength > 0.7 ? 0.7 : 0.5;
    } else if (street === "turn") {
      // Turn sizing: slightly larger than flop
      betMultiplier = boardTexture.isWet ? 0.6 : 0.5;
    } else {
      // Flop sizing
      if (boardTexture.isDry) {
        betMultiplier = 0.33 + profile.aggression * 0.12;
      } else if (boardTexture.isWet) {
        betMultiplier = 0.55 + profile.aggression * 0.15;
      } else {
        betMultiplier = 0.45 + profile.aggression * 0.10;
      }
    }

    const betSize = Math.round(pot * betMultiplier * 2) / 2;

    return {
      action: "bet",
      amount: Math.min(Math.max(betSize, 1), stack),
      confidence: betProb,
      reasoning: isPreflopAggressor
        ? (handStrength > 0.5 ? "Value betting" : "Continuation bet")
        : (handStrength > 0.5 ? "Value donk bet" : "Donk bluff"),
    };
  }

  return {
    action: "check",
    confidence: 1 - betProb,
    reasoning: "Checking",
  };
}

/**
 * Probe betting: betting when villain checked previous street
 */
function getProbeBetDecision(
  context: GameContext,
  handStrength: number,
  boardTexture: BoardTexture,
  profile: AIPlayerProfile
): AIDecision {
  const { pot, stack, street } = context;

  // Probe bet frequency - villain showed weakness
  let probeProb = 0.35 + profile.aggression * 0.25;

  // Stronger with value hands
  if (handStrength > 0.6) {
    probeProb = Math.min(0.9, probeProb + 0.3);
  }
  // More on dry boards
  if (boardTexture.isDry) {
    probeProb *= 1.2;
  }

  if (Math.random() < probeProb) {
    // Probe sizing: usually smaller (40-50% pot)
    const betMultiplier = 0.4 + profile.aggression * 0.1;
    const betSize = Math.round(pot * betMultiplier * 2) / 2;

    return {
      action: "bet",
      amount: Math.min(Math.max(betSize, 1), stack),
      confidence: probeProb,
      reasoning: "Probe betting - villain showed weakness",
    };
  }

  return {
    action: "check",
    confidence: 1 - probeProb,
    reasoning: "Checking back",
  };
}

/**
 * Decide how to respond to a bet
 * Now with street-specific adjustments
 */
function getFacingBetDecision(
  context: GameContext,
  handStrength: number,
  boardTexture: BoardTexture,
  profile: AIPlayerProfile,
  street: Street = "flop"
): AIDecision {
  const { pot, currentBet, playerBet, stack, isInPosition } = context;
  const toCall = currentBet - playerBet;
  const potOdds = toCall / (pot + toCall);
  const betSize = currentBet / pot; // Bet as fraction of pot

  // Street-specific defense frequency adjustments
  // Should defend less on later streets with marginal hands
  let defenseMultiplier = 1.0;
  if (street === "turn") {
    defenseMultiplier = 0.85;
  } else if (street === "river") {
    defenseMultiplier = 0.7;
  }

  // Position adjustment: IP can float more
  if (isInPosition) {
    defenseMultiplier *= 1.15;
  }

  // Very strong hands - raise for value
  if (handStrength > 0.8) {
    let raiseProb = 0.5 + profile.aggression * 0.3;

    // Raise more on river with monsters
    if (street === "river") {
      raiseProb = Math.min(0.95, raiseProb * 1.3);
    }

    if (Math.random() < raiseProb) {
      const raiseSize = Math.round(currentBet * (2 + profile.aggression) * 2) / 2;
      return {
        action: "raise",
        amount: Math.min(raiseSize, stack + playerBet),
        confidence: 0.9,
        reasoning: "Raising for value",
      };
    }
    return { action: "call", confidence: 0.95, reasoning: "Slow-playing strong hand" };
  }

  // Strong hands - mostly call, sometimes raise
  if (handStrength > 0.6) {
    const raiseProb = profile.aggression * 0.3 * defenseMultiplier;
    if (Math.random() < raiseProb) {
      const raiseSize = Math.round(currentBet * 2.5 * 2) / 2;
      return {
        action: "raise",
        amount: Math.min(raiseSize, stack + playerBet),
        confidence: 0.75,
        reasoning: "Raising strong hand",
      };
    }
    return { action: "call", confidence: 0.85, reasoning: "Calling with strong hand" };
  }

  // Medium hands - pot odds decision with street adjustment
  if (handStrength > 0.35) {
    const requiredEquity = potOdds * (0.8 + profile.foldToCbet * 0.4) / defenseMultiplier;

    if (handStrength > requiredEquity) {
      // Floating IP with medium hands on flop/turn
      if (isInPosition && street !== "river" && handStrength > 0.4) {
        return { action: "call", confidence: 0.7, reasoning: "Floating in position" };
      }
      return { action: "call", confidence: 0.65, reasoning: "Calling with odds" };
    }
  }

  // Drawing hands - consider implied odds on earlier streets
  if (street !== "river" && (boardTexture.hasFlushDraw || boardTexture.hasStraightDraw)) {
    if (handStrength > 0.25 && betSize < 0.75) {
      return { action: "call", confidence: 0.55, reasoning: "Chasing draw with implied odds" };
    }
  }

  // Weak hands - fold or bluff raise (less on river)
  const bluffRaiseProb = street === "river"
    ? profile.bluffFreq * 0.08
    : profile.bluffFreq * 0.15;

  if (Math.random() < bluffRaiseProb && toCall < pot * 0.5) {
    const raiseSize = Math.round(currentBet * 2.5 * 2) / 2;
    return {
      action: "raise",
      amount: Math.min(raiseSize, stack + playerBet),
      confidence: 0.4,
      reasoning: "Bluff raising",
    };
  }

  // Calling stations call more (but less on river)
  const stationThreshold = street === "river" ? 0.20 : 0.30;
  if (profile.foldToCbet < stationThreshold && toCall < pot * 0.6) {
    return { action: "call", confidence: 0.5, reasoning: "Calling as station" };
  }

  return { action: "fold", confidence: profile.foldToCbet, reasoning: "Folding to bet" };
}

// ============================================
// Board Texture Analysis
// ============================================

interface BoardTexture {
  isDry: boolean;
  isWet: boolean;
  isPaired: boolean;
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  highCard: string;
  connectedness: number;
}

function analyzeBoardTexture(communityCards: Card[]): BoardTexture {
  if (communityCards.length === 0) {
    return {
      isDry: true,
      isWet: false,
      isPaired: false,
      hasFlushDraw: false,
      hasStraightDraw: false,
      highCard: "",
      connectedness: 0,
    };
  }

  const suits = communityCards.map(c => c.suit);
  const ranks = communityCards.map(c => "AKQJT98765432".indexOf(c.rank));

  // Check for flush potential
  const suitCounts = new Map<string, number>();
  suits.forEach(s => suitCounts.set(s, (suitCounts.get(s) || 0) + 1));
  const maxSuitCount = Math.max(...suitCounts.values());
  const hasFlushDraw = maxSuitCount >= 2;

  // Check for pairing
  const rankCounts = new Map<number, number>();
  ranks.forEach(r => rankCounts.set(r, (rankCounts.get(r) || 0) + 1));
  const isPaired = Array.from(rankCounts.values()).some(c => c >= 2);

  // Check for straight potential
  const sortedRanks = [...new Set(ranks)].sort((a, b) => a - b);
  let maxConnected = 1;
  let currentConnected = 1;
  for (let i = 1; i < sortedRanks.length; i++) {
    if (sortedRanks[i] - sortedRanks[i - 1] <= 2) {
      currentConnected++;
      maxConnected = Math.max(maxConnected, currentConnected);
    } else {
      currentConnected = 1;
    }
  }
  const hasStraightDraw = maxConnected >= 2;

  // Determine texture
  const highCard = communityCards.reduce((max, c) =>
    "AKQJT98765432".indexOf(c.rank) < "AKQJT98765432".indexOf(max.rank) ? c : max
  ).rank;

  const connectedness = maxConnected / communityCards.length;
  const isWet = hasFlushDraw || hasStraightDraw || connectedness > 0.5;
  const isDry = !isWet && !isPaired;

  return {
    isDry,
    isWet,
    isPaired,
    hasFlushDraw,
    hasStraightDraw,
    highCard,
    connectedness,
  };
}

// ============================================
// Helper Functions
// ============================================

function isInPosition(ourPosition: Position, villainPosition: Position): boolean {
  const order: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
  return order.indexOf(ourPosition) > order.indexOf(villainPosition);
}

function estimatePreflopStrength(hand: string): number {
  // Premium: AA-QQ, AKs, AKo
  const premium = ["AA", "KK", "QQ", "JJ", "AKs", "AKo", "AQs"];
  if (premium.includes(hand)) return 0.9;

  // Strong: TT-88, AQo, AJs, KQs
  const strong = ["TT", "99", "88", "AQo", "AJs", "ATs", "KQs", "KJs", "QJs"];
  if (strong.includes(hand)) return 0.7;

  // Playable: 77-22, suited aces, broadway
  const playable = [
    "77", "66", "55", "44", "33", "22",
    "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    "KTs", "K9s", "QTs", "JTs", "T9s",
    "AJo", "ATo", "KQo", "KJo", "QJo",
  ];
  if (playable.includes(hand)) return 0.5;

  // Speculative: suited connectors
  const speculative = ["98s", "87s", "76s", "65s", "54s", "J9s", "T8s", "97s"];
  if (speculative.includes(hand)) return 0.35;

  // Junk
  return 0.15;
}

/**
 * Estimates the relative strength of a hand based on made hands.
 * Returns a value from 0 to 1 representing hand strength percentile.
 *
 * Current implementation checks for:
 * - Four of a kind (0.98)
 * - Full house (0.95)
 * - Flush (0.88)
 * - Straight (0.82)
 * - Three of a kind (0.75)
 * - Two pair (0.60)
 * - One pair (0.40)
 * - High card (0.20)
 *
 * @param holeCards - Player's hole cards
 * @param communityCards - Community cards on the board
 * @returns Hand strength as a value between 0 and 1
 *
 * @todo Add draw equity (OESD, flush draws)
 * @todo Consider board texture impact
 * @todo Add blocker effects
 * @todo Adjust for kicker strength
 */
function estimateHandStrength(holeCards: [Card, Card], communityCards: Card[]): number {
  const numOpponents = 1;
  return estimateHandStrengthVsOpponents(holeCards, communityCards, numOpponents);
}

function estimateHandStrengthVsOpponents(
  holeCards: [Card, Card],
  communityCards: Card[],
  numOpponents: number
): number {
  if (communityCards.length >= 3) {
    return estimateEquityMonteCarlo(holeCards, communityCards, numOpponents);
  }

  // Fallback heuristic for non-standard states (preflop/partial boards)
  const allCards = [...holeCards, ...communityCards];
  const rankCounts = new Map<string, number>();
  const suitCounts = new Map<string, number>();

  for (const card of allCards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  }

  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const maxSuit = Math.max(...suitCounts.values());

  // Four of a kind
  if (counts[0] >= 4) return 0.98;

  // Full house
  if (counts[0] >= 3 && counts[1] >= 2) return 0.95;

  // Flush
  if (maxSuit >= 5) return 0.88;

  // Check for straight (including wheel A-2-3-4-5)
  const rankValues = allCards.map(c => "AKQJT98765432".indexOf(c.rank)).sort((a, b) => a - b);
  const uniqueRanks = [...new Set(rankValues)];
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) return 0.82;
  }
  // Wheel straight (A-2-3-4-5)
  const wheelRanks = [0, 9, 10, 11, 12]; // A,5,4,3,2 in index order
  if (wheelRanks.every(r => uniqueRanks.includes(r))) {
    return 0.82;
  }

  // Three of a kind
  if (counts[0] >= 3) return 0.75;

  // Two pair
  if (counts[0] >= 2 && counts[1] >= 2) return 0.60;

  // One pair
  if (counts[0] >= 2) {
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count >= 2)?.[0];
    if (pairRank && communityCards.length > 0) {
      const boardHighCard = communityCards.reduce((max, c) =>
        "AKQJT98765432".indexOf(c.rank) < "AKQJT98765432".indexOf(max.rank) ? c : max
      );
      // Top pair or overpair
      if (pairRank === boardHighCard.rank || "AKQJT98765432".indexOf(pairRank) < "AKQJT98765432".indexOf(boardHighCard.rank)) {
        return 0.55;
      }
      // Middle/bottom pair
      return 0.35;
    }
    return 0.40;
  }

  // Calculate draw equity (only on flop and turn)
  let drawEquity = 0;
  if (communityCards.length >= 3 && communityCards.length < 5) {
    drawEquity = calculateDrawEquity(holeCards, communityCards);
  }

  // High card
  const highCard = holeCards.reduce((max, c) =>
    "AKQJT98765432".indexOf(c.rank) < "AKQJT98765432".indexOf(max.rank) ? c : max
  );
  const highCardValue = 14 - "AKQJT98765432".indexOf(highCard.rank);
  const baseStrength = 0.10 + (highCardValue / 14) * 0.20;

  // Combine base strength with draw equity
  return Math.min(0.99, baseStrength + drawEquity);
}

function estimateEquityMonteCarlo(
  holeCards: [Card, Card],
  communityCards: Card[],
  numOpponents: number
): number {
  const opponents = Math.max(1, Math.min(numOpponents, 5));
  const iterations = getMonteCarloIterations(communityCards.length, opponents);
  if (iterations === 0) return 0.5;

  const deck = buildDeckExcluding([...holeCards, ...communityCards]);
  const remainingBoardCards = 5 - communityCards.length;

  let equity = 0;

  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffleDeck(deck);
    let cursor = 0;

    const board = [...communityCards];
    for (let j = 0; j < remainingBoardCards; j++) {
      board.push(shuffled[cursor++]);
    }

    const opponentHands: [Card, Card][] = [];
    for (let o = 0; o < opponents; o++) {
      const card1 = shuffled[cursor++];
      const card2 = shuffled[cursor++];
      opponentHands.push([card1, card2]);
    }

    const heroEval = evaluateHand(holeCards, board);
    let bestRank = heroEval.rankValue;
    let winners = 1;
    let heroWins = true;

    for (const oppHand of opponentHands) {
      const oppEval = evaluateHand(oppHand, board);
      if (oppEval.rankValue > bestRank) {
        bestRank = oppEval.rankValue;
        winners = 1;
        heroWins = false;
      } else if (oppEval.rankValue === bestRank) {
        winners += 1;
        if (!heroWins) {
          // hero already behind
          continue;
        }
      }
    }

    if (heroWins) {
      equity += 1 / winners;
    }
  }

  return equity / iterations;
}

function getMonteCarloIterations(boardSize: number, opponents: number): number {
  const base = boardSize >= 5 ? 180 : boardSize === 4 ? 240 : 320;
  const scale = 1 / Math.sqrt(opponents);
  return Math.max(80, Math.round(base * scale));
}

function buildDeckExcluding(excluded: Card[]): Card[] {
  const excludedSet = new Set(excluded.map(c => `${c.rank}${c.suit}`));
  const deck: Card[] = [];
  for (const rank of "AKQJT98765432") {
    for (const suit of ["s", "h", "d", "c"] as const) {
      const key = `${rank}${suit}`;
      if (!excludedSet.has(key)) {
        deck.push({ rank: rank as Rank, suit });
      }
    }
  }
  return deck;
}

function shuffleDeck(cards: Card[]): Card[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Calculate equity from drawing hands.
 * Returns additional equity value to add to hand strength.
 *
 * @param holeCards - Player's hole cards
 * @param communityCards - Community cards (3 or 4 cards)
 * @returns Draw equity as a value between 0 and 0.35
 */
function calculateDrawEquity(holeCards: [Card, Card], communityCards: Card[]): number {
  const allCards = [...holeCards, ...communityCards];
  let equity = 0;

  // Check for flush draw (4 to a flush)
  const suitCounts = new Map<string, number>();
  for (const card of allCards) {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  }
  const maxSuit = Math.max(...suitCounts.values());

  if (maxSuit === 4) {
    // Flush draw: ~35% on flop (9 outs * 4 - 1), ~19% on turn (9 outs * 2 + 1)
    const cardsTocome = 5 - communityCards.length;
    equity += cardsTocome === 2 ? 0.35 : 0.19;
  }

  // Check for straight draws
  const rankOrder = "AKQJT98765432";
  const rankValues = allCards
    .map(c => rankOrder.indexOf(c.rank))
    .sort((a, b) => a - b);
  const uniqueRanks = [...new Set(rankValues)];

  // OESD: 4 consecutive cards with gaps on both ends
  for (let i = 0; i <= uniqueRanks.length - 4; i++) {
    const span = uniqueRanks[i + 3] - uniqueRanks[i];
    if (span === 3) {
      // Check if it's open-ended (not at the edges A-high or 5-low)
      const lowRank = uniqueRanks[i];
      const highRank = uniqueRanks[i + 3];
      if (lowRank > 0 && highRank < 12) {
        // OESD: ~31% on flop (8 outs), ~17% on turn
        const cardsTocome = 5 - communityCards.length;
        equity += cardsTocome === 2 ? 0.31 : 0.17;
        break; // Only count one straight draw
      }
    }
  }

  // Check for gutshot (4 cards with one gap)
  if (equity < 0.15) { // Don't double-count with OESD
    for (let i = 0; i <= uniqueRanks.length - 4; i++) {
      const span = uniqueRanks[i + 3] - uniqueRanks[i];
      if (span === 4) {
        // Gutshot: ~17% on flop (4 outs), ~9% on turn
        const cardsTocome = 5 - communityCards.length;
        equity += cardsTocome === 2 ? 0.17 : 0.09;
        break;
      }
    }
  }

  // Cap draw equity to avoid overvaluing
  return Math.min(equity, 0.35);
}

export { getHandNotation };
