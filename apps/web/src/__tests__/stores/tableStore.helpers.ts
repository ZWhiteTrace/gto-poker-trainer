/**
 * Shared helpers, fixtures, and mock factories for tableStore tests.
 */
import type { Card, Rank, Suit, ActionType } from "@/lib/poker/types";
import { useTableStore } from "@/stores/tableStore";

// ============================================
// Card Factory
// ============================================

/** Quick card constructor: card("A", "s") => { rank: "A", suit: "s" } */
export function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

// ============================================
// Store Helpers
// ============================================

/** Initialize table with defaults + start a new hand, return getState */
export function setupTable(configOverrides?: Record<string, unknown>) {
  const store = useTableStore.getState();
  store.initializeTable(configOverrides as Parameters<typeof store.initializeTable>[0]);
  store.startNewHand();
  return useTableStore.getState;
}

/** Find hero's index in players array */
export function getHeroIndex(): number {
  const { players } = useTableStore.getState();
  return players.findIndex((p) => p.isHero);
}

/** Execute handleAction for N consecutive players (useful for fast-forwarding) */
export function actAll(action: ActionType, count?: number, amount?: number) {
  const n = count ?? 1;
  for (let i = 0; i < n; i++) {
    useTableStore.getState().handleAction(action, amount);
  }
}

/** Set specific hole cards for a player via setState */
export function setPlayerCards(playerIndex: number, cards: [Card, Card]) {
  const { players } = useTableStore.getState();
  const newPlayers = [...players];
  newPlayers[playerIndex] = { ...newPlayers[playerIndex], holeCards: cards };
  useTableStore.setState({ players: newPlayers });
}

/** Advance game to flop by having all players call/check preflop */
export function advanceToFlop() {
  const state = useTableStore.getState();
  // In preflop, all non-BB players need to call, BB checks
  // We'll call for everyone until the round transitions
  let safety = 0;
  while (useTableStore.getState().currentStreet === "preflop" && safety < 20) {
    const s = useTableStore.getState();
    if (s.phase !== "playing") break;
    const player = s.players[s.activePlayerIndex];
    if (!player || player.isFolded || !player.isActive) break;

    if (s.currentBet > player.currentBet) {
      s.handleAction("call");
    } else {
      s.handleAction("check");
    }
    safety++;
  }
}

// ============================================
// Common Mock Setup
// ============================================

/** Standard module mocks - call in vi.mock at top of each test file */
export const MOCK_AI_PROFILE = {
  id: "test-ai",
  name: "Test AI",
  nameZh: "測試AI",
  style: "TAG" as const,
  description: "Test",
  descriptionZh: "測試",
  avatar: "",
  vpip: 0.22,
  pfr: 0.18,
  aggression: 1.5,
  bluffFreq: 0.2,
  foldToBet: 0.4,
  threeBetFreq: 0.08,
  fourBetFreq: 0.02,
  coldCallFreq: 0.1,
  squeezFreq: 0.05,
  flopCBetFreq: 0.65,
  turnCBetFreq: 0.55,
  riverCBetFreq: 0.45,
  donkBetFreq: 0.1,
  probeFreq: 0.3,
  delayedCBetFreq: 0.2,
  checkRaiseFreq: 0.1,
  foldToCheckRaiseFreq: 0.4,
};

export const MOCK_AI_DECISION = {
  action: "call" as ActionType,
  amount: undefined,
  reasoning: "test",
};
