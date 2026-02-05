// ============================================
// GTO Poker Table Trainer - Type Definitions
// ============================================

// Position types for 6-max table
export type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";

// Street/phase of the hand
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

// Player actions
export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "allin";

// Game phase for UI state
export type GamePhase = "setup" | "playing" | "waiting" | "showdown" | "result";

// Card suits
export type Suit = "s" | "h" | "d" | "c";

// Card ranks
export type Rank = "A" | "K" | "Q" | "J" | "T" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

// ============================================
// Card Types
// ============================================

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HoleCards = [Card, Card];

// ============================================
// Player Types
// ============================================

export interface Player {
  id: string;
  name: string;
  position: Position;
  stack: number;           // In BB
  holeCards: HoleCards | null;
  currentBet: number;      // Current street bet
  totalInvested: number;   // Total invested this hand
  isActive: boolean;       // Still in hand (not folded)
  isFolded: boolean;
  isAllIn: boolean;
  isHero: boolean;
  isDealer: boolean;
  seatIndex: number;       // 0-5 for table position
}

// ============================================
// Action Types
// ============================================

export interface ActionRecord {
  playerId: string;
  playerName: string;
  position: Position;
  action: ActionType;
  amount?: number;
  street: Street;
  timestamp: number;
  isHero: boolean;
}

export interface AvailableAction {
  type: ActionType;
  minAmount?: number;
  maxAmount?: number;
  label: string;
  labelZh: string;
}

// ============================================
// Pot Types
// ============================================

export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // Player IDs
}

// ============================================
// Hand Evaluation Types
// ============================================

export type HandRank =
  | "high_card"
  | "pair"
  | "two_pair"
  | "three_of_a_kind"
  | "straight"
  | "flush"
  | "full_house"
  | "four_of_a_kind"
  | "straight_flush"
  | "royal_flush";

export interface HandEvaluation {
  rank: HandRank;
  rankValue: number;      // Numeric value for comparison
  description: string;
  descriptionZh: string;
  kickers: Rank[];        // For tiebreaking
}

// ============================================
// Game Configuration
// ============================================

export interface GameConfig {
  tableSize: 6;
  startingStack: number;  // In BB, default 100
  blinds: {
    sb: number;
    bb: number;
  };
  ante: number;
  timeBank: number;       // Seconds per decision
}

// ============================================
// Training Scenario Types
// ============================================

export type ScenarioCategory =
  | "heads_up"
  | "3bet_pot"
  | "4bet_pot"
  | "multiway"
  | "squeeze"
  | "short_stack"
  | "deep_stack";

export interface ScenarioPreset {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  category: ScenarioCategory;

  // Setup configuration
  heroPosition: Position;
  numPlayers: number;           // 2-6
  effectiveStack: number;       // In BB

  // Preflop action sequence (optional)
  preflopActions?: ActionRecord[];

  // Predetermined board (optional, for postflop focus)
  board?: {
    flop?: [Card, Card, Card];
    turn?: Card;
    river?: Card;
  };

  // Hero hand (optional, random if not specified)
  heroHand?: HoleCards;

  // Training focus points
  trainingFocus: string[];
}

// ============================================
// AI Profile Types
// ============================================

export type AIStyle = "GTO" | "LAG" | "TAG" | "Loose_Passive" | "Tight_Passive" | "Maniac";

// AI Opponent Stats - 追蹤對各 AI 類型的戰績
export interface AIOpponentStat {
  handsPlayed: number;
  handsWon: number;
  totalProfit: number;  // BB
}

// 雙層追蹤：按類型 + 按個體
export interface AIOpponentStats {
  byStyle: Record<AIStyle, AIOpponentStat>;
  byPlayer: Record<string, AIOpponentStat & { name: string; style: AIStyle }>;
}

export const DEFAULT_AI_OPPONENT_STAT: AIOpponentStat = {
  handsPlayed: 0,
  handsWon: 0,
  totalProfit: 0,
};

export const DEFAULT_AI_OPPONENT_STATS: AIOpponentStats = {
  byStyle: {
    GTO: { ...DEFAULT_AI_OPPONENT_STAT },
    LAG: { ...DEFAULT_AI_OPPONENT_STAT },
    TAG: { ...DEFAULT_AI_OPPONENT_STAT },
    Loose_Passive: { ...DEFAULT_AI_OPPONENT_STAT },
    Tight_Passive: { ...DEFAULT_AI_OPPONENT_STAT },
    Maniac: { ...DEFAULT_AI_OPPONENT_STAT },
  },
  byPlayer: {},
};

export interface AIProfile {
  id: string;
  name: string;
  style: AIStyle;

  // Adjustment factors (1.0 = GTO baseline)
  vpipModifier: number;        // Voluntarily put money in pot
  pfrModifier: number;         // Preflop raise frequency
  aggressionFactor: number;    // Postflop aggression
  bluffFrequency: number;      // Bluff to value ratio
  foldToAggression: number;    // Fold to bets/raises

  // Position awareness (0-1, 1 = fully positional)
  positionAwareness: number;
}

// ============================================
// Advanced Statistics Types
// ============================================

export interface HeroStats {
  // Basic stats
  handsPlayed: number;
  handsVPIP: number;        // Voluntarily put money in pot
  handsPFR: number;         // Preflop raise

  // 3-Bet stats
  threeBetCount: number;    // Times hero 3-bet
  threeBetOpportunity: number; // Times hero could 3-bet
  foldTo3BetCount: number;  // Times hero folded to 3-bet
  faced3BetCount: number;   // Times hero faced 3-bet

  // Steal stats (ATS)
  stealAttempts: number;    // Raise from CO/BTN/SB when folded to
  stealOpportunities: number;

  // Continuation bet stats (by street)
  flopCBet: number;         // Times c-bet on flop
  flopCBetOpportunity: number;
  turnCBet: number;
  turnCBetOpportunity: number;
  riverCBet: number;
  riverCBetOpportunity: number;

  // Facing c-bet stats
  foldToCBet: number;       // Times folded to c-bet
  callCBet: number;         // Times called c-bet
  raiseCBet: number;        // Times raised c-bet
  facedCBet: number;        // Total times faced c-bet

  // Showdown stats
  wentToShowdown: number;   // Times reached showdown
  wonAtShowdown: number;    // Times won at showdown

  // Aggression tracking
  totalBets: number;        // Total bets made
  totalRaises: number;      // Total raises made
  totalCalls: number;       // Total calls made

  // Check-raise stats
  checkRaiseCount: number;
  checkRaiseOpportunity: number;
}

// Default empty stats
export const DEFAULT_HERO_STATS: HeroStats = {
  handsPlayed: 0,
  handsVPIP: 0,
  handsPFR: 0,
  threeBetCount: 0,
  threeBetOpportunity: 0,
  foldTo3BetCount: 0,
  faced3BetCount: 0,
  stealAttempts: 0,
  stealOpportunities: 0,
  flopCBet: 0,
  flopCBetOpportunity: 0,
  turnCBet: 0,
  turnCBetOpportunity: 0,
  riverCBet: 0,
  riverCBetOpportunity: 0,
  foldToCBet: 0,
  callCBet: 0,
  raiseCBet: 0,
  facedCBet: 0,
  wentToShowdown: 0,
  wonAtShowdown: 0,
  totalBets: 0,
  totalRaises: 0,
  totalCalls: 0,
  checkRaiseCount: 0,
  checkRaiseOpportunity: 0,
};

// ============================================
// GTO Hint Types
// ============================================

export type HintMode = "off" | "after" | "before" | "detailed";

export type BoardTexture =
  | "dry"           // 乾燥：無聯繫、無同花聽牌
  | "semi_wet"      // 半濕潤：有一些聽牌可能
  | "wet"           // 濕潤：多重聽牌可能
  | "monotone"      // 單花：三張同花
  | "paired"        // 對子公牌
  | "connected";    // 連接：順子可能

export type HandStrengthCategory =
  | "nuts"          // 堅果：最強牌
  | "strong"        // 強牌：頂對好踢腳、兩對、暗三
  | "medium"        // 中等：中對、弱頂對
  | "weak"          // 弱牌：底對、A高
  | "draw"          // 聽牌：同花聽、順子聽
  | "air";          // 空氣：無牌力

export interface GTOHint {
  // Recommended actions with frequencies
  recommendations: {
    action: ActionType;
    frequency: number;      // 0-100%
    sizing?: number;        // Bet size in % of pot
    isPrimary: boolean;     // Is this the main recommended action
  }[];

  // Explanation
  reasoning: {
    boardTexture: BoardTexture;
    boardTextureZh: string;
    handStrength: HandStrengthCategory;
    handStrengthZh: string;
    positionAdvantage: "IP" | "OOP";
    keyFactors: string[];   // Key decision factors
    keyFactorsZh: string[];
    // Solver data (if available)
    solverData?: {
      scenarioId?: string;
      hand?: string;
      strategy?: Record<string, number>;
      turnAdjustment?: {
        turnType: string;
        turnTypeZh: string;
      };
      riverAdjustment?: {
        riverType: string;
        riverTypeZh: string;
      };
    };
  };

  // EV estimate (optional)
  evEstimate?: {
    action: ActionType;
    ev: number;
  }[];
}

// ============================================
// Table State
// ============================================

export interface TableState {
  // Game Configuration
  config: GameConfig;

  // Current Hand State
  handNumber: number;
  dealerSeatIndex: number;
  players: Player[];
  communityCards: Card[];
  pot: number;
  lastWonPot: number; // Store the won pot for display at result phase
  sidePots: SidePot[];
  deck: Card[];

  // Betting State
  currentStreet: Street;
  activePlayerIndex: number;
  lastAggressorIndex: number | null;
  actionsThisRound: number; // Track actions since last raise/bet for round completion
  currentBet: number;
  minRaise: number;

  // Action tracking
  actionHistory: ActionRecord[];
  streetActions: Map<Street, ActionRecord[]>;

  // Game Phase
  phase: GamePhase;
  isTransitioning: boolean; // Flag to track street transition to prevent race conditions

  // Results
  winners: Player[] | null;
  handEvaluations: Map<string, HandEvaluation>;

  // Training Mode
  trainingMode: {
    enabled: boolean;
    scenario: ScenarioPreset | null;
    showGTOHints: boolean;
    showEV: boolean;
    hintMode: HintMode;  // off | after | before | detailed
  };

  // Session Statistics
  sessionStats: {
    handsPlayed: number;
    handsWon: number;
    totalProfit: number;
    biggestPot: number;
  };

  // Position-based Statistics
  positionStats: Record<Position, {
    handsPlayed: number;
    handsWon: number;
    totalProfit: number;
  }>;

  // Hero Statistics (for AI adaptation and detailed tracking)
  heroStats: HeroStats;

  // AI Opponent Statistics (追蹤對各 AI 的戰績)
  aiOpponentStats: AIOpponentStats;

  // UI State
  aiThinking: boolean;
  showBetSlider: boolean;
  selectedBetSize: number;

  // Auto rotation
  autoRotate: boolean;
}

// ============================================
// Store Actions Interface
// ============================================

export interface TableActions {
  // Setup
  initializeTable: (config?: Partial<GameConfig>) => void;
  setHeroPosition: (position: Position) => void;
  loadScenario: (scenario: ScenarioPreset) => void;

  // Game Flow
  startNewHand: () => void;
  dealHoleCards: () => void;
  dealFlop: () => void;
  dealTurn: () => void;
  dealRiver: () => void;
  runOutBoard: () => void;

  // Player Actions
  handleAction: (action: ActionType, amount?: number) => void;
  getAvailableActions: () => AvailableAction[];
  checkBettingRoundComplete: (players: Player[], nextIndex: number, lastAggressor: number | null, currentBet: number, actionsThisRound: number) => boolean;

  // AI
  processAITurn: () => Promise<void>;

  // Hand Resolution
  determineWinners: () => void;
  awardPot: () => void;

  // Training
  getGTORecommendation: () => { action: ActionType; frequency: number } | null;

  // Session
  resetSession: () => void;

  // UI
  setShowBetSlider: (show: boolean) => void;
  setSelectedBetSize: (size: number) => void;

  // Auto rotation
  setAutoRotate: (autoRotate: boolean) => void;
}

// ============================================
// Constants
// ============================================

export const POSITIONS: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

export const POSITION_LABELS: Record<Position, { en: string; zh: string }> = {
  UTG: { en: "Under the Gun", zh: "槍口位" },
  HJ: { en: "Hijack", zh: "劫位" },
  CO: { en: "Cutoff", zh: "關煞位" },
  BTN: { en: "Button", zh: "按鈕位" },
  SB: { en: "Small Blind", zh: "小盲" },
  BB: { en: "Big Blind", zh: "大盲" },
};

export const RANKS: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

export const SUITS: Suit[] = ["s", "h", "d", "c"];

export const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

// For inline text on page background (supports dark mode)
export const SUIT_COLORS: Record<string, string> = {
  s: "text-slate-900 dark:text-slate-100",  // 黑桃：黑色
  h: "text-red-600 dark:text-red-400",      // 紅心：紅色
  d: "text-blue-600 dark:text-blue-400",    // 方塊：藍色（四色牌）
  c: "text-green-600 dark:text-green-400",  // 梅花：綠色（四色牌）
};

// For text on card backgrounds (always light/white bg, no dark mode override)
export const SUIT_CARD_COLORS: Record<string, string> = {
  s: "text-slate-900",   // 黑桃：黑色
  h: "text-red-600",     // 紅心：紅色
  d: "text-blue-600",    // 方塊：藍色（四色牌）
  c: "text-green-600",   // 梅花：綠色（四色牌）
};

export const HAND_RANK_VALUES: Record<HandRank, number> = {
  high_card: 1,
  pair: 2,
  two_pair: 3,
  three_of_a_kind: 4,
  straight: 5,
  flush: 6,
  full_house: 7,
  four_of_a_kind: 8,
  straight_flush: 9,
  royal_flush: 10,
};

export const DEFAULT_CONFIG: GameConfig = {
  tableSize: 6,
  startingStack: 100,
  blinds: { sb: 0.5, bb: 1 },
  ante: 0,
  timeBank: 30,
};

// ============================================
// Hand History Types
// ============================================

export interface HandHistoryPlayer {
  name: string;
  position: Position;
  stack: number;           // Starting stack for this hand
  holeCards: HoleCards | null;  // null if not shown
  seatIndex: number;
  isHero: boolean;
  aiStyle?: AIStyle;       // AI 玩家風格 (非 Hero)
  aiProfileId?: string;    // AI profile ID (如 "lag-larry")
}

export interface HandHistoryAction {
  position: Position;
  action: ActionType;
  amount?: number;
  isAllIn?: boolean;
}

export interface HandHistoryStreetActions {
  preflop: HandHistoryAction[];
  flop: HandHistoryAction[];
  turn: HandHistoryAction[];
  river: HandHistoryAction[];
}

export interface HandHistoryResult {
  winners: {
    position: Position;
    amount: number;
    handRank?: HandRank;
    handDescription?: string;
  }[];
  showdownHands?: {
    position: Position;
    cards: HoleCards;
    handRank: HandRank;
    handDescription: string;
  }[];
}

export interface HandHistory {
  id: string;
  timestamp: number;
  handNumber: number;

  // Game info
  tableName: string;
  tableSize: number;
  blinds: { sb: number; bb: number };
  ante: number;

  // Players at the start of the hand
  players: HandHistoryPlayer[];
  dealerPosition: Position;

  // Community cards
  board: {
    flop?: [Card, Card, Card];
    turn?: Card;
    river?: Card;
  };

  // Actions by street
  actions: HandHistoryStreetActions;

  // Result
  result: HandHistoryResult;

  // Hero specific
  heroPosition: Position;
  heroProfit: number;  // BB won/lost
}
