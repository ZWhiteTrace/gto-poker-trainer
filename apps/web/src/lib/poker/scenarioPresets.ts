// ============================================
// Training Scenario Presets
// ============================================

import type { ScenarioPreset, Position, ScenarioCategory, ActionRecord, Card } from "./types";

/**
 * Predefined training scenarios for focused practice
 */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  // ========================================
  // Heads-Up Scenarios
  // ========================================
  {
    id: "btn-vs-bb-srp",
    name: "BTN vs BB Single Raised Pot",
    nameZh: "BTN vs BB 單加注底池",
    description: "Classic heads-up spot after BTN open and BB call",
    descriptionZh: "經典單挑場景：按鈕位加注，大盲跟注",
    category: "heads_up",
    heroPosition: "BTN",
    numPlayers: 2,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "Hero",
        position: "BTN",
        action: "raise",
        amount: 2.5,
        street: "preflop",
        timestamp: 0,
        isHero: true,
      },
      {
        playerId: "player_0",
        playerName: "AI_BB",
        position: "BB",
        action: "call",
        amount: 2.5,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
    ],
    trainingFocus: ["Position advantage", "C-bet strategy", "Pot control"],
  },
  {
    id: "bb-vs-btn-srp",
    name: "BB vs BTN Single Raised Pot",
    nameZh: "BB vs BTN 單加注底池 (OOP)",
    description: "Defending BB against BTN open, playing out of position",
    descriptionZh: "防守大盲對抗按鈕位加注，位置劣勢",
    category: "heads_up",
    heroPosition: "BB",
    numPlayers: 2,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "AI_BTN",
        position: "BTN",
        action: "raise",
        amount: 2.5,
        street: "preflop",
        timestamp: 0,
        isHero: false,
      },
      {
        playerId: "player_0",
        playerName: "Hero",
        position: "BB",
        action: "call",
        amount: 2.5,
        street: "preflop",
        timestamp: 1,
        isHero: true,
      },
    ],
    trainingFocus: ["Check-raise spots", "Donk betting", "Playing OOP"],
  },
  {
    id: "co-vs-bb-srp",
    name: "CO vs BB Single Raised Pot",
    nameZh: "CO vs BB 單加注底池",
    description: "CO open, BB defends - wider range dynamics",
    descriptionZh: "關煞位加注，大盲防守 - 較寬的範圍對抗",
    category: "heads_up",
    heroPosition: "CO",
    numPlayers: 2,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_3",
        playerName: "Hero",
        position: "CO",
        action: "raise",
        amount: 2.3,
        street: "preflop",
        timestamp: 0,
        isHero: true,
      },
      {
        playerId: "player_0",
        playerName: "AI_BB",
        position: "BB",
        action: "call",
        amount: 2.3,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
    ],
    trainingFocus: ["Range advantage", "Board texture reading", "Sizing tells"],
  },

  // ========================================
  // 3-Bet Pot Scenarios
  // ========================================
  {
    id: "3bet-btn-vs-bb-ip",
    name: "3-Bet Pot IP (BTN vs BB 3b)",
    nameZh: "3-Bet 底池 IP (BTN 跟注 BB 3bet)",
    description: "BTN opens, BB 3-bets, BTN calls - playing 3bet pot IP",
    descriptionZh: "按鈕位加注被大盲3bet後跟注，有位置優勢的3bet底池",
    category: "3bet_pot",
    heroPosition: "BTN",
    numPlayers: 2,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "Hero",
        position: "BTN",
        action: "raise",
        amount: 2.5,
        street: "preflop",
        timestamp: 0,
        isHero: true,
      },
      {
        playerId: "player_0",
        playerName: "AI_BB",
        position: "BB",
        action: "raise",
        amount: 9,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
      {
        playerId: "player_2",
        playerName: "Hero",
        position: "BTN",
        action: "call",
        amount: 9,
        street: "preflop",
        timestamp: 2,
        isHero: true,
      },
    ],
    trainingFocus: ["3bet pot ranges", "SPR considerations", "Value vs bluff"],
  },
  {
    id: "3bet-bb-vs-co-oop",
    name: "3-Bet Pot OOP (BB 3b vs CO)",
    nameZh: "3-Bet 底池 OOP (BB 3bet CO)",
    description: "CO opens, BB 3-bets, CO calls - playing 3bet pot OOP",
    descriptionZh: "大盲3bet關煞位加注後被跟注，無位置優勢的3bet底池",
    category: "3bet_pot",
    heroPosition: "BB",
    numPlayers: 2,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_3",
        playerName: "AI_CO",
        position: "CO",
        action: "raise",
        amount: 2.3,
        street: "preflop",
        timestamp: 0,
        isHero: false,
      },
      {
        playerId: "player_0",
        playerName: "Hero",
        position: "BB",
        action: "raise",
        amount: 8,
        street: "preflop",
        timestamp: 1,
        isHero: true,
      },
      {
        playerId: "player_3",
        playerName: "AI_CO",
        position: "CO",
        action: "call",
        amount: 8,
        street: "preflop",
        timestamp: 2,
        isHero: false,
      },
    ],
    trainingFocus: ["Aggression frequency", "Board coverage", "C-bet sizing OOP"],
  },
  {
    id: "3bet-sb-vs-btn",
    name: "SB vs BTN 3-Bet Pot",
    nameZh: "SB vs BTN 3-Bet 底池",
    description: "BTN opens, SB 3-bets, BTN calls - blind vs blind battle",
    descriptionZh: "按鈕位加注，小盲3bet後被跟注",
    category: "3bet_pot",
    heroPosition: "SB",
    numPlayers: 2,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "AI_BTN",
        position: "BTN",
        action: "raise",
        amount: 2.5,
        street: "preflop",
        timestamp: 0,
        isHero: false,
      },
      {
        playerId: "player_1",
        playerName: "Hero",
        position: "SB",
        action: "raise",
        amount: 10,
        street: "preflop",
        timestamp: 1,
        isHero: true,
      },
      {
        playerId: "player_2",
        playerName: "AI_BTN",
        position: "BTN",
        action: "call",
        amount: 10,
        street: "preflop",
        timestamp: 2,
        isHero: false,
      },
    ],
    trainingFocus: ["SB 3-bet strategy", "Playing vs positional player", "Pot commitment"],
  },

  // ========================================
  // 4-Bet Pot Scenarios
  // ========================================
  {
    id: "4bet-btn-vs-bb",
    name: "4-Bet Pot (BTN 4b vs BB 3b)",
    nameZh: "4-Bet 底池 (BTN 4bet BB)",
    description: "BTN opens, BB 3-bets, BTN 4-bets, BB calls",
    descriptionZh: "按鈕位加注被大盲3bet後4bet，大盲跟注",
    category: "4bet_pot",
    heroPosition: "BTN",
    numPlayers: 2,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "Hero",
        position: "BTN",
        action: "raise",
        amount: 2.5,
        street: "preflop",
        timestamp: 0,
        isHero: true,
      },
      {
        playerId: "player_0",
        playerName: "AI_BB",
        position: "BB",
        action: "raise",
        amount: 9,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
      {
        playerId: "player_2",
        playerName: "Hero",
        position: "BTN",
        action: "raise",
        amount: 22,
        street: "preflop",
        timestamp: 2,
        isHero: true,
      },
      {
        playerId: "player_0",
        playerName: "AI_BB",
        position: "BB",
        action: "call",
        amount: 22,
        street: "preflop",
        timestamp: 3,
        isHero: false,
      },
    ],
    trainingFocus: ["4bet pot play", "Commitment decisions", "All-in or fold spots"],
  },

  // ========================================
  // Multiway Scenarios
  // ========================================
  {
    id: "multiway-btn-3way",
    name: "3-Way Pot (BTN open, 2 callers)",
    nameZh: "三人底池 (BTN 加注兩人跟)",
    description: "BTN opens, CO and BB call - multiway pot dynamics",
    descriptionZh: "按鈕位加注，關煞位和大盲跟注",
    category: "multiway",
    heroPosition: "BTN",
    numPlayers: 3,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "Hero",
        position: "BTN",
        action: "raise",
        amount: 2.5,
        street: "preflop",
        timestamp: 0,
        isHero: true,
      },
      {
        playerId: "player_3",
        playerName: "AI_CO",
        position: "CO",
        action: "call",
        amount: 2.5,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
      {
        playerId: "player_0",
        playerName: "AI_BB",
        position: "BB",
        action: "call",
        amount: 2.5,
        street: "preflop",
        timestamp: 2,
        isHero: false,
      },
    ],
    trainingFocus: ["Multiway equity", "Tighter c-betting", "Value heavy approach"],
  },
  {
    id: "multiway-bb-defend",
    name: "BB Defend in Multiway",
    nameZh: "大盲多人底池防守",
    description: "UTG opens, BTN calls, BB defends",
    descriptionZh: "槍口位加注，按鈕位跟注，大盲防守",
    category: "multiway",
    heroPosition: "BB",
    numPlayers: 3,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_5",
        playerName: "AI_UTG",
        position: "UTG",
        action: "raise",
        amount: 2.2,
        street: "preflop",
        timestamp: 0,
        isHero: false,
      },
      {
        playerId: "player_2",
        playerName: "AI_BTN",
        position: "BTN",
        action: "call",
        amount: 2.2,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
      {
        playerId: "player_0",
        playerName: "Hero",
        position: "BB",
        action: "call",
        amount: 2.2,
        street: "preflop",
        timestamp: 2,
        isHero: true,
      },
    ],
    trainingFocus: ["Multiway OOP", "Pot odds defense", "Set mining"],
  },

  // ========================================
  // Squeeze Scenarios
  // ========================================
  {
    id: "squeeze-btn",
    name: "BTN Squeeze Spot",
    nameZh: "BTN Squeeze 場景",
    description: "UTG opens, HJ calls, BTN squeezes",
    descriptionZh: "槍口位加注，劫位跟注，按鈕位squeeze",
    category: "squeeze",
    heroPosition: "BTN",
    numPlayers: 3,
    effectiveStack: 100,
    preflopActions: [
      {
        playerId: "player_5",
        playerName: "AI_UTG",
        position: "UTG",
        action: "raise",
        amount: 2.2,
        street: "preflop",
        timestamp: 0,
        isHero: false,
      },
      {
        playerId: "player_4",
        playerName: "AI_HJ",
        position: "HJ",
        action: "call",
        amount: 2.2,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
    ],
    trainingFocus: ["Squeeze range", "Fold equity", "Risk vs reward"],
  },

  // ========================================
  // Short Stack Scenarios
  // ========================================
  {
    id: "short-stack-btn",
    name: "Short Stack BTN (25BB)",
    nameZh: "短碼 BTN (25BB)",
    description: "Playing 25BB effective as BTN",
    descriptionZh: "25BB 有效籌碼按鈕位",
    category: "short_stack",
    heroPosition: "BTN",
    numPlayers: 2,
    effectiveStack: 25,
    trainingFocus: ["Push/fold", "3bet shove", "SPR awareness"],
  },
  {
    id: "short-stack-bb",
    name: "Short Stack BB Defense (30BB)",
    nameZh: "短碼 BB 防守 (30BB)",
    description: "Defending BB with 30BB stack",
    descriptionZh: "30BB 有效籌碼大盲防守",
    category: "short_stack",
    heroPosition: "BB",
    numPlayers: 2,
    effectiveStack: 30,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "AI_BTN",
        position: "BTN",
        action: "raise",
        amount: 2.5,
        street: "preflop",
        timestamp: 0,
        isHero: false,
      },
    ],
    trainingFocus: ["3bet shove range", "Flat calling range", "ICM considerations"],
  },

  // ========================================
  // Deep Stack Scenarios
  // ========================================
  {
    id: "deep-stack-150bb",
    name: "Deep Stack (150BB)",
    nameZh: "深籌碼 (150BB)",
    description: "Playing 150BB effective - implied odds matter more",
    descriptionZh: "150BB 有效籌碼 - 隱含賠率更重要",
    category: "deep_stack",
    heroPosition: "BTN",
    numPlayers: 2,
    effectiveStack: 150,
    preflopActions: [
      {
        playerId: "player_2",
        playerName: "Hero",
        position: "BTN",
        action: "raise",
        amount: 3,
        street: "preflop",
        timestamp: 0,
        isHero: true,
      },
      {
        playerId: "player_0",
        playerName: "AI_BB",
        position: "BB",
        action: "call",
        amount: 3,
        street: "preflop",
        timestamp: 1,
        isHero: false,
      },
    ],
    trainingFocus: ["Implied odds", "Set mining", "Speculative hands"],
  },
];

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: ScenarioCategory): ScenarioPreset[] {
  return SCENARIO_PRESETS.filter((s) => s.category === category);
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((s) => s.id === id);
}

/**
 * Get all categories with their display names
 */
export const SCENARIO_CATEGORIES: Array<{
  id: ScenarioCategory;
  name: string;
  nameZh: string;
  description: string;
}> = [
  { id: "heads_up", name: "Heads-Up", nameZh: "單挑", description: "2-player situations" },
  {
    id: "3bet_pot",
    name: "3-Bet Pots",
    nameZh: "3-Bet 底池",
    description: "Playing in 3-bet pots",
  },
  {
    id: "4bet_pot",
    name: "4-Bet Pots",
    nameZh: "4-Bet 底池",
    description: "Playing in 4-bet pots",
  },
  { id: "multiway", name: "Multiway", nameZh: "多人底池", description: "3+ player pots" },
  { id: "squeeze", name: "Squeeze", nameZh: "Squeeze", description: "Squeeze opportunities" },
  { id: "short_stack", name: "Short Stack", nameZh: "短碼", description: "Under 35BB effective" },
  { id: "deep_stack", name: "Deep Stack", nameZh: "深籌碼", description: "Over 120BB effective" },
];
