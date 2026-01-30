// ============================================
// GTO Poker Table Trainer - Type Definitions
// ============================================

// Position types for 6-max table
export type Position = "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB";

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

  // Hero Statistics (for AI adaptation)
  heroStats: {
    handsPlayed: number;
    handsVPIP: number;
    handsPFR: number;
    foldTo3BetCount: number;
    faced3BetCount: number;
  };

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

  // Player Actions
  handleAction: (action: ActionType, amount?: number) => void;
  getAvailableActions: () => AvailableAction[];
  checkBettingRoundComplete: (players: Player[], nextIndex: number, lastAggressor: number | null) => boolean;

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

export const POSITIONS: Position[] = ["UTG", "MP", "CO", "BTN", "SB", "BB"];

export const POSITION_LABELS: Record<Position, { en: string; zh: string }> = {
  UTG: { en: "Under the Gun", zh: "槍口位" },
  MP: { en: "Middle Position", zh: "中位" },
  CO: { en: "Cutoff", zh: "關煞位" },
  BTN: { en: "Button", zh: "按鈕位" },
  SB: { en: "Small Blind", zh: "小盲" },
  BB: { en: "Big Blind", zh: "大盲" },
};

export const RANKS: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

export const SUITS: Suit[] = ["s", "h", "d", "c"];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

export const SUIT_COLORS: Record<Suit, string> = {
  s: "text-slate-900",  // 黑桃：始終黑色（卡牌背景是白色）
  h: "text-red-500",    // 紅心：紅色
  d: "text-blue-500",   // 方塊：藍色
  c: "text-green-700",  // 梅花：深綠色
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
