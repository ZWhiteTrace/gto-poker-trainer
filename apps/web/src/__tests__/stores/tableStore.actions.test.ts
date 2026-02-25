/**
 * tableStore action tests: handleAction, betting rounds, available actions
 */
import { useTableStore } from "@/stores/tableStore";
import { setupTable, getHeroIndex } from "./tableStore.helpers";

// ============================================
// Module Mocks (inline - vi.mock is hoisted)
// ============================================
vi.mock("@/lib/poker/aiDecisionEngine", () => {
  const p = {
    id: "test-ai", name: "Test AI", nameZh: "測試AI", style: "TAG",
    description: "Test", descriptionZh: "測試", avatar: "",
    vpip: 0.22, pfr: 0.18, aggression: 1.5, bluffFreq: 0.2, foldToBet: 0.4,
    threeBetFreq: 0.08, fourBetFreq: 0.02, coldCallFreq: 0.1, squeezFreq: 0.05,
    flopCBetFreq: 0.65, turnCBetFreq: 0.55, riverCBetFreq: 0.45,
    donkBetFreq: 0.1, probeFreq: 0.3, delayedCBetFreq: 0.2,
    checkRaiseFreq: 0.1, foldToCheckRaiseFreq: 0.4,
  };
  return {
    getAIDecision: vi.fn(() => ({ action: "call", reasoning: "test" })),
    AI_PROFILES: [
      { ...p, id: "tag-tony", name: "TAG Tony", nameZh: "TAG Tony", style: "TAG" },
      { ...p, id: "lag-larry", name: "LAG Larry", nameZh: "LAG Larry", style: "LAG" },
      { ...p, id: "gto-grace", name: "GTO Grace", nameZh: "GTO Grace", style: "GTO" },
    ],
    getAIProfile: vi.fn(() => p),
  };
});

vi.mock("@/lib/poker/handEvaluator", () => ({
  evaluateHand: vi.fn(() => ({
    rank: "pair", rankValue: 200, description: "Pair of Aces",
    descriptionZh: "一對A", kickers: ["A"],
  })),
  determineWinners: vi.fn((players: { id: string }[]) =>
    players.length > 0
      ? [{ playerId: players[0].id, evaluation: { rank: "pair", rankValue: 200 } }]
      : []
  ),
}));

vi.mock("@/lib/poker/handHistory", () => ({
  createHandHistory: vi.fn(() => ({ id: "test-hand" })),
  saveHandHistory: vi.fn(),
}));

// ============================================
// Setup
// ============================================
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useTableStore.getState().resetSession();
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================
// handleAction - fold
// ============================================
describe("handleAction - fold", () => {
  it("should set player isFolded=true and isActive=false", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    useTableStore.getState().handleAction("fold");
    const player = useTableStore.getState().players[activePlayerIndex];
    expect(player.isFolded).toBe(true);
    expect(player.isActive).toBe(false);
  });

  it("should not change pot", () => {
    setupTable();
    const potBefore = useTableStore.getState().pot;
    useTableStore.getState().handleAction("fold");
    expect(useTableStore.getState().pot).toBe(potBefore);
  });

  it("should end hand when only 1 player remains", () => {
    setupTable();
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    expect(useTableStore.getState().phase).toBe("result");
  });

  it("should award pot to last remaining player", () => {
    setupTable();
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    expect(useTableStore.getState().winners).toHaveLength(1);
  });

  it("should record fold in action history", () => {
    setupTable();
    useTableStore.getState().handleAction("fold");
    const { actionHistory } = useTableStore.getState();
    expect(actionHistory[actionHistory.length - 1].action).toBe("fold");
  });
});

// ============================================
// handleAction - check
// ============================================
describe("handleAction - check", () => {
  it("should not change stack or bet", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const player = useTableStore.getState().players[activePlayerIndex];
    const stackBefore = player.stack;
    const betBefore = player.currentBet;

    useTableStore.setState({ currentBet: 0 });
    useTableStore.getState().handleAction("check");

    const afterPlayer = useTableStore.getState().players[activePlayerIndex];
    expect(afterPlayer.stack).toBe(stackBefore);
    expect(afterPlayer.currentBet).toBe(betBefore);
  });

  it("should advance to next player", () => {
    setupTable();
    useTableStore.setState({ currentBet: 0 });
    const before = useTableStore.getState().activePlayerIndex;
    useTableStore.getState().handleAction("check");
    expect(useTableStore.getState().activePlayerIndex).not.toBe(before);
  });
});

// ============================================
// handleAction - call
// ============================================
describe("handleAction - call", () => {
  it("should deduct callAmount from stack", () => {
    setupTable();
    const { activePlayerIndex, currentBet } = useTableStore.getState();
    const player = useTableStore.getState().players[activePlayerIndex];
    const callAmount = currentBet - player.currentBet;
    const stackBefore = player.stack;

    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().players[activePlayerIndex].stack).toBe(stackBefore - callAmount);
  });

  it("should add callAmount to pot", () => {
    setupTable();
    const { pot, activePlayerIndex, currentBet } = useTableStore.getState();
    const callAmount = currentBet - useTableStore.getState().players[activePlayerIndex].currentBet;

    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().pot).toBe(pot + callAmount);
  });

  it("should align player currentBet with table currentBet", () => {
    setupTable();
    const { currentBet, activePlayerIndex } = useTableStore.getState();
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().players[activePlayerIndex].currentBet).toBe(currentBet);
  });

  it("should update totalInvested", () => {
    setupTable();
    const { activePlayerIndex, currentBet } = useTableStore.getState();
    const player = useTableStore.getState().players[activePlayerIndex];
    const callAmount = currentBet - player.currentBet;

    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().players[activePlayerIndex].totalInvested).toBe(
      player.totalInvested + callAmount
    );
  });

  it("should go all-in if stack insufficient", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const players = [...useTableStore.getState().players];
    players[activePlayerIndex] = { ...players[activePlayerIndex], stack: 0.5, currentBet: 0 };
    useTableStore.setState({ players, currentBet: 1 });

    useTableStore.getState().handleAction("call");
    const afterPlayer = useTableStore.getState().players[activePlayerIndex];
    expect(afterPlayer.isAllIn).toBe(true);
    expect(afterPlayer.stack).toBe(0);
  });
});

// ============================================
// handleAction - bet/raise
// ============================================
describe("handleAction - bet/raise", () => {
  it("should clamp amount to [min, max]", () => {
    setupTable();
    const { activePlayerIndex, config } = useTableStore.getState();
    useTableStore.setState({ currentBet: 0 });
    useTableStore.getState().handleAction("bet", 0.1);

    expect(useTableStore.getState().players[activePlayerIndex].currentBet).toBeGreaterThanOrEqual(
      config.blinds.bb
    );
  });

  it("should update minRaise after a raise", () => {
    setupTable();
    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().minRaise).toBeGreaterThan(0);
  });

  it("should set lastAggressor", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().lastAggressorIndex).toBe(activePlayerIndex);
  });

  it("should reset actionsThisRound to 1", () => {
    setupTable();
    useTableStore.getState().handleAction("call");
    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().actionsThisRound).toBe(1);
  });

  it("should deduct correct amount from stack", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const player = useTableStore.getState().players[activePlayerIndex];
    const stackBefore = player.stack;

    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().players[activePlayerIndex].stack).toBe(
      stackBefore - (3 - player.currentBet)
    );
  });

  it("should add correct amount to pot", () => {
    setupTable();
    const { pot, activePlayerIndex } = useTableStore.getState();
    const player = useTableStore.getState().players[activePlayerIndex];

    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().pot).toBe(pot + (3 - player.currentBet));
  });
});

// ============================================
// handleAction - allin
// ============================================
describe("handleAction - allin", () => {
  it("should set stack=0 and isAllIn=true", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    useTableStore.getState().handleAction("allin");

    const player = useTableStore.getState().players[activePlayerIndex];
    expect(player.stack).toBe(0);
    expect(player.isAllIn).toBe(true);
  });

  it("should reopen betting for full raise (>= minRaise)", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    useTableStore.getState().handleAction("allin");

    const state = useTableStore.getState();
    expect(state.lastAggressorIndex).toBe(activePlayerIndex);
    expect(state.actionsThisRound).toBe(1);
  });

  it("should NOT reopen betting for incomplete raise (< minRaise)", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const players = [...useTableStore.getState().players];
    players[activePlayerIndex] = { ...players[activePlayerIndex], stack: 0.5, currentBet: 0 };
    useTableStore.setState({ players, currentBet: 1, minRaise: 1 });

    const actionsBeforeAllin = useTableStore.getState().actionsThisRound;
    useTableStore.getState().handleAction("allin");
    expect(useTableStore.getState().actionsThisRound).toBe(actionsBeforeAllin + 1);
  });

  it("should not change lastAggressor for call-allin (totalBet <= currentBet)", () => {
    setupTable();
    useTableStore.getState().handleAction("raise", 3);
    const lastAgg = useTableStore.getState().lastAggressorIndex;
    const { activePlayerIndex } = useTableStore.getState();

    const players = [...useTableStore.getState().players];
    const callAmount = 3 - players[activePlayerIndex].currentBet;
    players[activePlayerIndex] = { ...players[activePlayerIndex], stack: callAmount };
    useTableStore.setState({ players });

    useTableStore.getState().handleAction("allin");
    expect(useTableStore.getState().lastAggressorIndex).toBe(lastAgg);
  });

  it("should add full stack to pot", () => {
    setupTable();
    const { pot, activePlayerIndex } = useTableStore.getState();
    const playerStack = useTableStore.getState().players[activePlayerIndex].stack;

    useTableStore.getState().handleAction("allin");
    expect(useTableStore.getState().pot).toBe(pot + playerStack);
  });
});

// ============================================
// checkBettingRoundComplete
// ============================================
describe("checkBettingRoundComplete", () => {
  it("should return true when 0 players can act", () => {
    setupTable();
    const players = useTableStore.getState().players.map((p) => ({ ...p, isAllIn: true }));
    expect(useTableStore.getState().checkBettingRoundComplete(players, 0, null, 0, 6)).toBe(true);
  });

  it("should return true when 1 player can act and has matched bet", () => {
    setupTable();
    const players = useTableStore.getState().players.map((p, i) =>
      i === 0
        ? { ...p, isAllIn: false, isFolded: false, currentBet: 1 }
        : { ...p, isAllIn: true, isFolded: false }
    );
    expect(useTableStore.getState().checkBettingRoundComplete(players, 0, null, 1, 1)).toBe(true);
  });

  it("should return false when 1 player can act but hasn't matched bet", () => {
    setupTable();
    const players = useTableStore.getState().players.map((p, i) =>
      i === 0
        ? { ...p, isAllIn: false, isFolded: false, currentBet: 0 }
        : { ...p, isAllIn: true, isFolded: false }
    );
    expect(useTableStore.getState().checkBettingRoundComplete(players, 0, null, 1, 0)).toBe(false);
  });

  it("should return true when all match and actionsCount >= players", () => {
    setupTable();
    const players = useTableStore.getState().players.map((p) => ({
      ...p, isAllIn: false, isFolded: false, currentBet: 1,
    }));
    expect(useTableStore.getState().checkBettingRoundComplete(players, 0, null, 1, 6)).toBe(true);
  });

  it("should return false when all match but actionsCount < players", () => {
    setupTable();
    const players = useTableStore.getState().players.map((p) => ({
      ...p, isAllIn: false, isFolded: false, currentBet: 1,
    }));
    expect(useTableStore.getState().checkBettingRoundComplete(players, 0, null, 1, 2)).toBe(false);
  });

  it("should return false when bets are not equal", () => {
    setupTable();
    const players = useTableStore.getState().players.map((p, i) => ({
      ...p, isAllIn: false, isFolded: false, currentBet: i === 0 ? 2 : 1,
    }));
    expect(useTableStore.getState().checkBettingRoundComplete(players, 0, null, 2, 6)).toBe(false);
  });
});

// ============================================
// getAvailableActions
// ============================================
describe("getAvailableActions", () => {
  it("should show fold + call + raise + allin when there is a bet", () => {
    setupTable();
    const types = useTableStore.getState().getAvailableActions().map((a) => a.type);
    expect(types).toContain("fold");
    expect(types).toContain("call");
    expect(types).toContain("raise");
    expect(types).toContain("allin");
  });

  it("should show check + bet + allin when no bet", () => {
    setupTable();
    useTableStore.setState({ currentBet: 0 });
    const players = useTableStore.getState().players.map((p) => ({ ...p, currentBet: 0 }));
    useTableStore.setState({ players });

    const types = useTableStore.getState().getAvailableActions().map((a) => a.type);
    expect(types).toContain("check");
    expect(types).toContain("bet");
    expect(types).toContain("allin");
    expect(types).not.toContain("fold");
    expect(types).not.toContain("call");
  });

  it("should only show fold + allin when call >= stack", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const players = [...useTableStore.getState().players];
    players[activePlayerIndex] = { ...players[activePlayerIndex], stack: 0.5, currentBet: 0 };
    useTableStore.setState({ players, currentBet: 1 });

    const types = useTableStore.getState().getAvailableActions().map((a) => a.type);
    expect(types).toContain("fold");
    expect(types).toContain("allin");
    expect(types).not.toContain("call");
    expect(types).not.toContain("raise");
  });

  it("should set correct raise minAmount and maxAmount", () => {
    setupTable();
    const raise = useTableStore.getState().getAvailableActions().find((a) => a.type === "raise");
    const { currentBet, config } = useTableStore.getState();
    expect(raise).toBeDefined();
    expect(raise!.minAmount!).toBeGreaterThanOrEqual(currentBet + config.blinds.bb);
  });

  it("should set bet min to BB and max to stack", () => {
    setupTable();
    useTableStore.setState({ currentBet: 0 });
    const players = useTableStore.getState().players.map((p) => ({ ...p, currentBet: 0 }));
    useTableStore.setState({ players });

    const bet = useTableStore.getState().getAvailableActions().find((a) => a.type === "bet");
    const { config, activePlayerIndex } = useTableStore.getState();
    expect(bet!.minAmount).toBe(config.blinds.bb);
    expect(bet!.maxAmount).toBe(useTableStore.getState().players[activePlayerIndex].stack);
  });

  it("should return empty when player is folded", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const players = [...useTableStore.getState().players];
    players[activePlayerIndex] = { ...players[activePlayerIndex], isFolded: true };
    useTableStore.setState({ players });
    expect(useTableStore.getState().getAvailableActions()).toHaveLength(0);
  });

  it("should show allin amount equal to player stack", () => {
    setupTable();
    const playerStack = useTableStore.getState().players[useTableStore.getState().activePlayerIndex].stack;
    const allin = useTableStore.getState().getAvailableActions().find((a) => a.type === "allin");
    expect(allin!.minAmount).toBe(playerStack);
    expect(allin!.maxAmount).toBe(playerStack);
  });
});

// ============================================
// Action history tracking
// ============================================
describe("action history", () => {
  it("should record all actions in order", () => {
    setupTable();
    useTableStore.getState().handleAction("call");
    useTableStore.getState().handleAction("fold");
    const { actionHistory } = useTableStore.getState();
    expect(actionHistory).toHaveLength(2);
    expect(actionHistory[0].action).toBe("call");
    expect(actionHistory[1].action).toBe("fold");
  });

  it("should record correct street", () => {
    setupTable();
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().actionHistory[0].street).toBe("preflop");
  });

  it("should record hero flag correctly", () => {
    setupTable();
    const isHero = useTableStore.getState().players[useTableStore.getState().activePlayerIndex].isHero;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().actionHistory[0].isHero).toBe(isHero);
  });

  it("should record amount for calls", () => {
    setupTable();
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().actionHistory[0].amount).toBeGreaterThan(0);
  });
});

// ============================================
// Edge cases
// ============================================
describe("handleAction edge cases", () => {
  it("should not act on folded player", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const players = [...useTableStore.getState().players];
    players[activePlayerIndex] = { ...players[activePlayerIndex], isFolded: true };
    useTableStore.setState({ players });

    const potBefore = useTableStore.getState().pot;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().pot).toBe(potBefore);
  });

  it("should not act on inactive player", () => {
    setupTable();
    const { activePlayerIndex } = useTableStore.getState();
    const players = [...useTableStore.getState().players];
    players[activePlayerIndex] = { ...players[activePlayerIndex], isActive: false };
    useTableStore.setState({ players });

    const potBefore = useTableStore.getState().pot;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().pot).toBe(potBefore);
  });
});
