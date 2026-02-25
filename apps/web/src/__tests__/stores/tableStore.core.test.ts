/**
 * tableStore core tests: initialization, deck, players, positions
 */
import { useTableStore } from "@/stores/tableStore";
import { setupTable, getHeroIndex } from "./tableStore.helpers";

// ============================================
// Module Mocks (inline values - vi.mock is hoisted)
// ============================================
const _p = {
  id: "test-ai", name: "Test AI", nameZh: "測試AI", style: "TAG",
  description: "Test", descriptionZh: "測試", avatar: "",
  vpip: 0.22, pfr: 0.18, aggression: 1.5, bluffFreq: 0.2, foldToBet: 0.4,
  threeBetFreq: 0.08, fourBetFreq: 0.02, coldCallFreq: 0.1, squeezFreq: 0.05,
  flopCBetFreq: 0.65, turnCBetFreq: 0.55, riverCBetFreq: 0.45,
  donkBetFreq: 0.1, probeFreq: 0.3, delayedCBetFreq: 0.2,
  checkRaiseFreq: 0.1, foldToCheckRaiseFreq: 0.4,
};

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
// initializeTable
// ============================================
describe("initializeTable", () => {
  it("should create 6 players", () => {
    useTableStore.getState().initializeTable();
    expect(useTableStore.getState().players).toHaveLength(6);
  });

  it("should use default config (100BB, 0.5/1 blinds)", () => {
    useTableStore.getState().initializeTable();
    const { config } = useTableStore.getState();
    expect(config.startingStack).toBe(100);
    expect(config.blinds.sb).toBe(0.5);
    expect(config.blinds.bb).toBe(1);
    expect(config.tableSize).toBe(6);
    expect(config.ante).toBe(0);
  });

  it("should apply custom config overrides", () => {
    useTableStore.getState().initializeTable({
      startingStack: 50,
      blinds: { sb: 1, bb: 2 },
    });
    const { config } = useTableStore.getState();
    expect(config.startingStack).toBe(50);
    expect(config.blinds.sb).toBe(1);
    expect(config.blinds.bb).toBe(2);
  });

  it("should set phase to setup", () => {
    useTableStore.getState().initializeTable();
    expect(useTableStore.getState().phase).toBe("setup");
  });

  it("should reset sessionStats to zero", () => {
    useTableStore.getState().initializeTable();
    const { sessionStats } = useTableStore.getState();
    expect(sessionStats.handsPlayed).toBe(0);
    expect(sessionStats.handsWon).toBe(0);
    expect(sessionStats.totalProfit).toBe(0);
    expect(sessionStats.biggestPot).toBe(0);
  });

  it("should set handNumber to 0", () => {
    useTableStore.getState().initializeTable();
    expect(useTableStore.getState().handNumber).toBe(0);
  });

  it("should give each player startingStack", () => {
    useTableStore.getState().initializeTable({ startingStack: 200 });
    useTableStore.getState().players.forEach((p) => {
      expect(p.stack).toBe(200);
    });
  });
});

// ============================================
// startNewHand
// ============================================
describe("startNewHand", () => {
  beforeEach(() => {
    useTableStore.getState().initializeTable();
  });

  it("should rotate dealer when autoRotate=true", () => {
    const initialDealer = useTableStore.getState().dealerSeatIndex;
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().dealerSeatIndex).toBe((initialDealer + 1) % 6);
  });

  it("should NOT rotate dealer when autoRotate=false", () => {
    useTableStore.getState().setAutoRotate(false);
    const initialDealer = useTableStore.getState().dealerSeatIndex;
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().dealerSeatIndex).toBe(initialDealer);
  });

  it("should post SB and BB correctly", () => {
    useTableStore.getState().startNewHand();
    const { players, dealerSeatIndex, config } = useTableStore.getState();
    const sbIndex = (dealerSeatIndex + 1) % 6;
    const bbIndex = (dealerSeatIndex + 2) % 6;

    expect(players[sbIndex].currentBet).toBe(config.blinds.sb);
    expect(players[sbIndex].totalInvested).toBe(config.blinds.sb);
    expect(players[sbIndex].stack).toBe(config.startingStack - config.blinds.sb);

    expect(players[bbIndex].currentBet).toBe(config.blinds.bb);
    expect(players[bbIndex].totalInvested).toBe(config.blinds.bb);
    expect(players[bbIndex].stack).toBe(config.startingStack - config.blinds.bb);
  });

  it("should set pot = SB + BB", () => {
    useTableStore.getState().startNewHand();
    const { pot, config } = useTableStore.getState();
    expect(pot).toBe(config.blinds.sb + config.blinds.bb);
  });

  it("should set UTG as first to act (dealer + 3)", () => {
    useTableStore.getState().startNewHand();
    const { activePlayerIndex, dealerSeatIndex } = useTableStore.getState();
    expect(activePlayerIndex).toBe((dealerSeatIndex + 3) % 6);
  });

  it("should deal 2 hole cards to each player", () => {
    useTableStore.getState().startNewHand();
    useTableStore.getState().players.forEach((p) => {
      expect(p.holeCards).not.toBeNull();
      expect(p.holeCards).toHaveLength(2);
    });
  });

  it("should set phase to playing", () => {
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().phase).toBe("playing");
  });

  it("should increment handNumber", () => {
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().handNumber).toBe(1);
    // Complete hand quickly
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    vi.advanceTimersByTime(1000);
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().handNumber).toBe(2);
  });

  it("should reset communityCards to empty", () => {
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().communityCards).toHaveLength(0);
  });

  it("should set currentStreet to preflop", () => {
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().currentStreet).toBe("preflop");
  });

  it("should set currentBet to BB", () => {
    useTableStore.getState().startNewHand();
    expect(useTableStore.getState().currentBet).toBe(useTableStore.getState().config.blinds.bb);
  });

  it("should reset all players to active, not folded, not all-in", () => {
    useTableStore.getState().startNewHand();
    useTableStore.getState().players.forEach((p) => {
      expect(p.isActive).toBe(true);
      expect(p.isFolded).toBe(false);
      expect(p.isAllIn).toBe(false);
    });
  });

  it("should set lastAggressorIndex to BB index", () => {
    useTableStore.getState().startNewHand();
    const { lastAggressorIndex, dealerSeatIndex } = useTableStore.getState();
    expect(lastAggressorIndex).toBe((dealerSeatIndex + 2) % 6);
  });
});

// ============================================
// setHeroPosition
// ============================================
describe("setHeroPosition", () => {
  beforeEach(() => {
    useTableStore.getState().initializeTable();
  });

  it("should change hero position", () => {
    useTableStore.getState().setHeroPosition("UTG");
    const hero = useTableStore.getState().players.find((p) => p.isHero);
    expect(hero?.position).toBe("UTG");
  });

  it("should have exactly 1 hero", () => {
    useTableStore.getState().setHeroPosition("CO");
    const heroes = useTableStore.getState().players.filter((p) => p.isHero);
    expect(heroes).toHaveLength(1);
  });

  it("should set hero to different positions", () => {
    const positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;
    for (const pos of positions) {
      useTableStore.getState().setHeroPosition(pos);
      const hero = useTableStore.getState().players.find((p) => p.isHero);
      expect(hero?.position).toBe(pos);
    }
  });
});

// ============================================
// getPositionForSeat (tested via startNewHand)
// ============================================
describe("getPositionForSeat", () => {
  it("should assign correct positions after dealer rotation", () => {
    useTableStore.getState().initializeTable();
    // dealer defaults to seat 3, autoRotate moves to 4
    useTableStore.getState().startNewHand();
    const { players, dealerSeatIndex } = useTableStore.getState();
    expect(dealerSeatIndex).toBe(4);

    // seat 4=BTN, 5=SB, 0=BB, 1=UTG, 2=HJ, 3=CO
    expect(players[4].position).toBe("BTN");
    expect(players[5].position).toBe("SB");
    expect(players[0].position).toBe("BB");
    expect(players[1].position).toBe("UTG");
    expect(players[2].position).toBe("HJ");
    expect(players[3].position).toBe("CO");
  });

  it("should handle wraparound for dealer=0", () => {
    useTableStore.getState().initializeTable();
    useTableStore.getState().setAutoRotate(false);
    useTableStore.setState({ dealerSeatIndex: 0 });
    useTableStore.getState().startNewHand();
    const { players } = useTableStore.getState();

    expect(players[0].position).toBe("BTN");
    expect(players[1].position).toBe("SB");
    expect(players[2].position).toBe("BB");
    expect(players[3].position).toBe("UTG");
    expect(players[4].position).toBe("HJ");
    expect(players[5].position).toBe("CO");
  });

  it("should assign all 6 positions exactly once", () => {
    useTableStore.getState().initializeTable();
    useTableStore.getState().startNewHand();
    const positions = useTableStore.getState().players.map((p) => p.position);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(6);
    expect(uniquePositions).toContain("UTG");
    expect(uniquePositions).toContain("HJ");
    expect(uniquePositions).toContain("CO");
    expect(uniquePositions).toContain("BTN");
    expect(uniquePositions).toContain("SB");
    expect(uniquePositions).toContain("BB");
  });
});

// ============================================
// getNextActivePlayerIndex (tested via handleAction)
// ============================================
describe("getNextActivePlayerIndex", () => {
  beforeEach(() => {
    setupTable();
  });

  it("should skip folded players", () => {
    const firstActive = useTableStore.getState().activePlayerIndex;
    useTableStore.getState().handleAction("fold");
    expect(useTableStore.getState().activePlayerIndex).not.toBe(firstActive);
    expect(useTableStore.getState().players[firstActive].isFolded).toBe(true);
  });

  it("should skip all-in players", () => {
    useTableStore.getState().handleAction("allin");
    const { activePlayerIndex } = useTableStore.getState();
    // Next player should not be all-in
    expect(useTableStore.getState().players[activePlayerIndex].isAllIn).toBe(false);
  });

  it("should wrap around the table", () => {
    const before = useTableStore.getState().activePlayerIndex;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().activePlayerIndex).not.toBe(before);
  });

  it("should end hand when all but one fold", () => {
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    expect(useTableStore.getState().phase).toBe("result");
  });
});

// ============================================
// Deck creation
// ============================================
describe("deck", () => {
  it("should create 52 cards total (deck + dealt)", () => {
    setupTable();
    const { deck, players } = useTableStore.getState();
    const totalCards = deck.length + players.reduce((sum, p) => sum + (p.holeCards?.length ?? 0), 0);
    expect(totalCards).toBe(52);
  });

  it("should have no duplicate cards", () => {
    setupTable();
    const { deck, players } = useTableStore.getState();
    const allCards = [...deck];
    players.forEach((p) => {
      if (p.holeCards) allCards.push(...p.holeCards);
    });
    const cardStrings = allCards.map((c) => `${c.rank}${c.suit}`);
    expect(new Set(cardStrings).size).toBe(52);
  });
});

// ============================================
// resetSession
// ============================================
describe("resetSession", () => {
  it("should reset to initial state", () => {
    setupTable();
    useTableStore.getState().resetSession();
    const state = useTableStore.getState();
    expect(state.phase).toBe("setup");
    expect(state.players).toHaveLength(0);
    expect(state.handNumber).toBe(0);
    expect(state.pot).toBe(0);
  });

  it("should cancel transitions", () => {
    setupTable();
    useTableStore.setState({ isTransitioning: true });
    useTableStore.getState().resetSession();
    expect(useTableStore.getState().isTransitioning).toBe(false);
  });
});
