// ============================================
// AI Decision Engine v2.0
// Uses GTO range tables with player style adjustments
// ============================================

import type { Card, Position, ActionType, Street, AIStyle } from "./types";

// ============================================
// Import GTO Range Data (will be loaded dynamically)
// ============================================

// Static imports for the range data
import rfiData from "@data/ranges/6max/rfi_frequencies.json";
import vsRfiData from "@data/ranges/6max/vs_rfi_frequencies.json";
import vs3betData from "@data/ranges/6max/vs_3bet_frequencies.json";

type RFIFrequencies = Record<string, { raise?: number; fold?: number }>;
type VsRFIFrequencies = Record<string, { "3bet"?: number; call?: number; fold?: number }>;
type Vs3BetFrequencies = Record<string, { "4bet"?: number; call?: number; fold?: number }>;

// Position mapping (our code uses MP, JSON uses HJ)
const POSITION_MAP: Record<Position, string> = {
  UTG: "UTG",
  MP: "HJ",  // Our MP = JSON's HJ (Hijack)
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
  isAllInSituation?: boolean;
}

/**
 * Main AI decision function with style modifier
 */
export function getAIDecision(
  context: GameContext,
  profile: AIPlayerProfile = AI_PROFILES[0]
): AIDecision {
  const { street, holeCards, currentBet, playerBet, stack } = context;
  const handNotation = getHandNotation(holeCards);
  const toCall = currentBet - playerBet;

  // Check if we're facing an all-in
  if (toCall >= stack) {
    return getAllInResponse(context, handNotation, profile);
  }

  if (street === "preflop") {
    return getPreflopDecision(context, handNotation, profile);
  } else {
    return getPostflopDecision(context, handNotation, profile);
  }
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
  const handStrength = communityCards.length > 0
    ? estimateHandStrength(context.holeCards, communityCards)
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
  const { position, currentBet, playerBet, stack, hasRaiseInFront, lastAggressor, pot } = context;
  const toCall = currentBet - playerBet;

  // No raise in front - consider opening (RFI)
  if (!hasRaiseInFront && currentBet <= 1) {
    return getRFIDecision(context, handNotation, profile);
  }

  // Facing a raise - check if it's a 3bet situation or RFI response
  if (hasRaiseInFront && lastAggressor) {
    // Check if we already raised (facing 3bet)
    if (playerBet > 1) {
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
    // Hand is in GTO range
    openProb = gtoFreq.raise / 100;
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
    // Calculate raise size based on position
    const positionSizes: Record<Position, number> = {
      UTG: 2.2,
      MP: 2.2,
      CO: 2.3,
      BTN: 2.5,
      SB: 3.0,
      BB: 3.0,
    };
    const baseSize = positionSizes[position] || 2.5;
    const raiseSize = baseSize * (0.9 + profile.aggression * 0.2);

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
    threeBetProb = gtoFreq.threeBet / 100;
    callProb = gtoFreq.call / 100;

    // Adjust based on player style
    // Higher 3bet frequency = more 3bets
    const threeBetAdjust = profile.threeBetFreq / 0.08; // Normalized to GTO
    threeBetProb *= threeBetAdjust;

    // Looser players call more
    const callAdjust = profile.vpip / 0.24;
    callProb *= Math.min(callAdjust, 1.5);

    // Tighter players 3bet less
    if (profile.vpip < 0.20) {
      threeBetProb *= 0.7;
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
    // 3bet sizing: IP ~3x, OOP ~3.5-4x
    const isIP = isInPosition(position, raiserPosition);
    const threeBetSize = currentBet * (isIP ? 3 : 3.5);

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
 * Postflop decision with board texture analysis
 */
function getPostflopDecision(
  context: GameContext,
  handNotation: string,
  profile: AIPlayerProfile
): AIDecision {
  const { pot, currentBet, playerBet, stack, communityCards } = context;
  const toCall = currentBet - playerBet;

  const handStrength = estimateHandStrength(context.holeCards, communityCards);
  const boardTexture = analyzeBoardTexture(communityCards);

  // No bet to face - consider betting or checking
  if (toCall === 0) {
    return getPostflopBetDecision(context, handStrength, boardTexture, profile);
  }

  // Facing a bet - call, raise, or fold
  return getFacingBetDecision(context, handStrength, boardTexture, profile);
}

/**
 * Decide whether to bet or check when facing no bet
 */
function getPostflopBetDecision(
  context: GameContext,
  handStrength: number,
  boardTexture: BoardTexture,
  profile: AIPlayerProfile
): AIDecision {
  const { pot, stack } = context;

  // C-bet decision
  const cbetProb = profile.cbetFreq;

  // Adjust c-bet frequency based on hand strength and board
  let adjustedCbetProb = cbetProb;

  // Strong hands - value bet
  if (handStrength > 0.7) {
    adjustedCbetProb = Math.min(0.9, cbetProb + 0.3);
  }
  // Medium hands - depends on board texture
  else if (handStrength > 0.4) {
    adjustedCbetProb = cbetProb * (boardTexture.isDry ? 1.2 : 0.8);
  }
  // Weak hands - bluff based on profile
  else {
    adjustedCbetProb = profile.bluffFreq * (boardTexture.isDry ? 1.0 : 0.5);
  }

  if (Math.random() < adjustedCbetProb) {
    // Sizing based on board texture and hand strength
    let betMultiplier: number;

    if (boardTexture.isDry) {
      betMultiplier = 0.33 + profile.aggression * 0.17; // 33-50%
    } else if (boardTexture.isWet) {
      betMultiplier = 0.55 + profile.aggression * 0.20; // 55-75%
    } else {
      betMultiplier = 0.45 + profile.aggression * 0.15; // 45-60%
    }

    const betSize = pot * betMultiplier;

    return {
      action: "bet",
      amount: Math.min(betSize, stack),
      confidence: adjustedCbetProb,
      reasoning: handStrength > 0.5 ? "Value betting" : "Continuation bet",
    };
  }

  return {
    action: "check",
    confidence: 1 - adjustedCbetProb,
    reasoning: "Checking back",
  };
}

/**
 * Decide how to respond to a bet
 */
function getFacingBetDecision(
  context: GameContext,
  handStrength: number,
  boardTexture: BoardTexture,
  profile: AIPlayerProfile
): AIDecision {
  const { pot, currentBet, playerBet, stack } = context;
  const toCall = currentBet - playerBet;
  const potOdds = toCall / (pot + toCall);

  // Very strong hands - raise for value
  if (handStrength > 0.8) {
    const raiseProb = 0.5 + profile.aggression * 0.3;

    if (Math.random() < raiseProb) {
      const raiseSize = currentBet * (2 + profile.aggression);
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
    if (Math.random() < profile.aggression * 0.3) {
      const raiseSize = currentBet * 2.5;
      return {
        action: "raise",
        amount: Math.min(raiseSize, stack + playerBet),
        confidence: 0.75,
        reasoning: "Raising strong hand",
      };
    }
    return { action: "call", confidence: 0.85, reasoning: "Calling with strong hand" };
  }

  // Medium hands - pot odds decision
  if (handStrength > 0.35) {
    // Adjust required equity based on fold tendency
    const requiredEquity = potOdds * (0.7 + profile.foldToCbet * 0.6);

    if (handStrength > requiredEquity) {
      return { action: "call", confidence: 0.65, reasoning: "Calling with odds" };
    }
  }

  // Weak hands - fold or bluff raise
  if (Math.random() < profile.bluffFreq * 0.15 && toCall < pot * 0.5) {
    const raiseSize = currentBet * 2.5;
    return {
      action: "raise",
      amount: Math.min(raiseSize, stack + playerBet),
      confidence: 0.4,
      reasoning: "Bluff raising",
    };
  }

  // Calling stations call more
  if (profile.foldToCbet < 0.30 && toCall < pot * 0.6) {
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
  const order: Position[] = ["UTG", "MP", "CO", "BTN", "SB", "BB"];
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

function estimateHandStrength(holeCards: [Card, Card], communityCards: Card[]): number {
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

  // Check for straight
  const rankValues = allCards.map(c => "AKQJT98765432".indexOf(c.rank)).sort((a, b) => a - b);
  const uniqueRanks = [...new Set(rankValues)];
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) return 0.82;
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

  // High card
  const highCard = holeCards.reduce((max, c) =>
    "AKQJT98765432".indexOf(c.rank) < "AKQJT98765432".indexOf(max.rank) ? c : max
  );
  const highCardValue = 14 - "AKQJT98765432".indexOf(highCard.rank);
  return 0.10 + (highCardValue / 14) * 0.20;
}

export { getHandNotation };
