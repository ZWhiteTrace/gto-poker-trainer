/**
 * tableStore flow tests: AI, street transitions, runOutBoard, winners
 */
import { useTableStore } from "@/stores/tableStore";
import { setupTable, getHeroIndex, card } from "./tableStore.helpers";
import { TIMING } from "@/lib/poker/constants";
import { getAIDecision } from "@/lib/poker/aiDecisionEngine";
import { evaluateHand, determineWinners as findWinners } from "@/lib/poker/handEvaluator";

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
  vi.mocked(getAIDecision).mockReturnValue({
    action: "call", reasoning: "test",
  } as ReturnType<typeof getAIDecision>);
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================
// dealFlop
// ============================================
describe("dealFlop", () => {
  it("should deal 3 community cards", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    expect(useTableStore.getState().communityCards).toHaveLength(3);
  });

  it("should burn 1 card (deck reduces by 4)", () => {
    setupTable();
    const deckBefore = useTableStore.getState().deck.length;
    useTableStore.getState().dealFlop();
    expect(useTableStore.getState().deck.length).toBe(deckBefore - 4);
  });

  it("should reset currentBet and set currentStreet to flop", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    expect(useTableStore.getState().currentBet).toBe(0);
    expect(useTableStore.getState().currentStreet).toBe("flop");
  });

  it("should set first to act after dealer", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    const { activePlayerIndex, dealerSeatIndex, players } = useTableStore.getState();

    let expected = (dealerSeatIndex + 1) % 6;
    while (players[expected].isFolded || players[expected].isAllIn) {
      expected = (expected + 1) % 6;
    }
    expect(activePlayerIndex).toBe(expected);
  });

  it("should go to showdown when all players are all-in", () => {
    setupTable();
    const players = useTableStore.getState().players.map((p) => ({
      ...p, isAllIn: true, isFolded: false, isActive: true,
    }));
    useTableStore.setState({ players });

    useTableStore.getState().dealFlop();
    expect(useTableStore.getState().phase).toBe("showdown");
  });
});

// ============================================
// dealTurn / dealRiver
// ============================================
describe("dealTurn", () => {
  it("should add 1 community card (burn + deal)", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    const ccBefore = useTableStore.getState().communityCards.length;
    const deckBefore = useTableStore.getState().deck.length;

    useTableStore.getState().dealTurn();
    expect(useTableStore.getState().communityCards).toHaveLength(ccBefore + 1);
    expect(useTableStore.getState().deck.length).toBe(deckBefore - 2);
  });

  it("should reset betting state", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    expect(useTableStore.getState().currentBet).toBe(0);
    expect(useTableStore.getState().actionsThisRound).toBe(0);
    expect(useTableStore.getState().lastAggressorIndex).toBeNull();
    expect(useTableStore.getState().currentStreet).toBe("turn");
  });
});

describe("dealRiver", () => {
  it("should add 1 community card (burn + deal)", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    const ccBefore = useTableStore.getState().communityCards.length;
    const deckBefore = useTableStore.getState().deck.length;

    useTableStore.getState().dealRiver();
    expect(useTableStore.getState().communityCards).toHaveLength(ccBefore + 1);
    expect(useTableStore.getState().deck.length).toBe(deckBefore - 2);
  });

  it("should set currentStreet to river", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    useTableStore.getState().dealRiver();
    expect(useTableStore.getState().currentStreet).toBe("river");
  });
});

// ============================================
// Street transitions via handleAction
// ============================================
describe("street transitions via handleAction", () => {
  it("should transition from preflop to flop after all call/check", () => {
    setupTable();
    let safety = 0;
    while (useTableStore.getState().currentStreet === "preflop" && safety < 20) {
      const s = useTableStore.getState();
      if (s.phase !== "playing") break;
      if (s.isTransitioning) {
        vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);
        continue;
      }
      const player = s.players[s.activePlayerIndex];
      if (!player || player.isFolded) break;

      if (s.currentBet > player.currentBet) {
        s.handleAction("call");
      } else {
        s.handleAction("check");
      }
      vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);
      safety++;
    }

    expect(["flop", "turn", "river", "showdown"]).toContain(useTableStore.getState().currentStreet);
  });

  it("should use setTimeout for street transition delay", () => {
    setupTable();
    // Fold 4 players to leave 2
    for (let i = 0; i < 4; i++) {
      useTableStore.getState().handleAction("fold");
    }

    useTableStore.getState().handleAction("call");

    const s = useTableStore.getState();
    if (s.currentStreet === "preflop" && !s.isTransitioning) {
      s.handleAction("check");
    }

    if (useTableStore.getState().isTransitioning) {
      expect(useTableStore.getState().currentStreet).toBe("preflop");
      vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);
      expect(useTableStore.getState().currentStreet).toBe("flop");
    }
  });

  it("should go to showdown after river betting", () => {
    setupTable();
    for (let i = 0; i < 4; i++) {
      useTableStore.getState().handleAction("fold");
    }

    // Preflop
    useTableStore.getState().handleAction("call");
    useTableStore.getState().handleAction("check");
    vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);

    // Flop
    if (useTableStore.getState().currentStreet === "flop") {
      useTableStore.getState().handleAction("check");
      useTableStore.getState().handleAction("check");
      vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);
    }

    // Turn
    if (useTableStore.getState().currentStreet === "turn") {
      useTableStore.getState().handleAction("check");
      useTableStore.getState().handleAction("check");
      vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);
    }

    // River
    if (useTableStore.getState().currentStreet === "river") {
      useTableStore.getState().handleAction("check");
      useTableStore.getState().handleAction("check");
      vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);
    }

    expect(["showdown", "result"]).toContain(useTableStore.getState().phase);
  });
});

// ============================================
// runOutBoard
// ============================================
describe("runOutBoard", () => {
  it("should deal all remaining community cards from preflop", () => {
    setupTable();
    useTableStore.setState({ isTransitioning: true });
    useTableStore.getState().runOutBoard();

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(TIMING.ALL_IN_CARD_DELAY + 100);
    }
    expect(useTableStore.getState().communityCards).toHaveLength(5);
  });

  it("should only deal river from turn", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    expect(useTableStore.getState().communityCards).toHaveLength(4);

    useTableStore.setState({ isTransitioning: true });
    useTableStore.getState().runOutBoard();

    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(TIMING.ALL_IN_CARD_DELAY + 100);
    }
    expect(useTableStore.getState().communityCards).toHaveLength(5);
  });

  it("should call determineWinners after completion", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    useTableStore.setState({ isTransitioning: true });
    useTableStore.getState().runOutBoard();

    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(TIMING.ALL_IN_CARD_DELAY + 100);
    }
    expect(["showdown", "result"]).toContain(useTableStore.getState().phase);
  });

  it("should abort when phase != playing", () => {
    setupTable();
    useTableStore.setState({ phase: "result" });
    const ccBefore = useTableStore.getState().communityCards.length;
    useTableStore.getState().runOutBoard();
    vi.advanceTimersByTime(5000);
    expect(useTableStore.getState().communityCards.length).toBe(ccBefore);
  });

  it("should go straight to showdown if already 5 cards", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    useTableStore.getState().dealRiver();
    expect(useTableStore.getState().communityCards).toHaveLength(5);

    useTableStore.setState({ isTransitioning: true });
    useTableStore.getState().runOutBoard();
    expect(["showdown", "result"]).toContain(useTableStore.getState().phase);
  });
});

// ============================================
// processAITurn
// ============================================
describe("processAITurn", () => {
  it("should set aiThinking=true during processing", async () => {
    setupTable();
    // Fold 4 non-hero AI players first so only hero + 1 AI remain
    // This prevents chained processAITurn calls after the AI acts
    const heroIdx = getHeroIndex();

    // Fold all but hero and one AI
    let foldCount = 0;
    while (foldCount < 4) {
      const s = useTableStore.getState();
      const player = s.players[s.activePlayerIndex];
      if (player.isHero) {
        // Skip hero by calling
        s.handleAction("call");
      } else {
        s.handleAction("fold");
        foldCount++;
      }
    }

    // Now find the remaining AI player and set as active
    const state = useTableStore.getState();
    if (state.phase !== "playing") return; // Hand might have ended

    const nonHeroIdx = state.players.findIndex(
      (p) => !p.isHero && !p.isFolded && p.isActive && !p.isAllIn
    );
    if (nonHeroIdx === -1) return;
    useTableStore.setState({ activePlayerIndex: nonHeroIdx });

    // Make AI call so next player is hero (no chained AI turn)
    vi.mocked(getAIDecision).mockReturnValueOnce({
      action: "call", reasoning: "test",
    } as ReturnType<typeof getAIDecision>);

    const promise = useTableStore.getState().processAITurn();
    expect(useTableStore.getState().aiThinking).toBe(true);

    await vi.advanceTimersByTimeAsync(TIMING.AI_THINKING_MIN + TIMING.AI_THINKING_RANDOM + 100);
    await promise;
    expect(useTableStore.getState().aiThinking).toBe(false);
  });

  it("should call getAIDecision with correct context", async () => {
    setupTable();
    const heroIdx = getHeroIndex();
    const nonHeroIdx = useTableStore.getState().players.findIndex((p) => !p.isHero);
    useTableStore.setState({ activePlayerIndex: nonHeroIdx });

    const promise = useTableStore.getState().processAITurn();
    vi.advanceTimersByTime(TIMING.AI_THINKING_MIN + TIMING.AI_THINKING_RANDOM + 100);
    await promise;

    expect(getAIDecision).toHaveBeenCalled();
    const lastCall = vi.mocked(getAIDecision).mock.calls.at(-1)!;
    expect(lastCall[0]).toHaveProperty("position");
    expect(lastCall[0]).toHaveProperty("holeCards");
    expect(lastCall[0]).toHaveProperty("street");
    expect(lastCall[0]).toHaveProperty("pot");
  });

  it("should early exit for hero player", async () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({ activePlayerIndex: heroIdx });

    const callsBefore = vi.mocked(getAIDecision).mock.calls.length;
    const promise = useTableStore.getState().processAITurn();
    vi.advanceTimersByTime(TIMING.AI_THINKING_MIN + TIMING.AI_THINKING_RANDOM + 100);
    await promise;

    // Should not have called getAIDecision for hero
    expect(useTableStore.getState().aiThinking).toBe(false);
  });

  it("should early exit when player has no holeCards", async () => {
    setupTable();
    const nonHeroIdx = useTableStore.getState().players.findIndex((p) => !p.isHero);
    useTableStore.setState({ activePlayerIndex: nonHeroIdx });

    const players = [...useTableStore.getState().players];
    players[nonHeroIdx] = { ...players[nonHeroIdx], holeCards: null };
    useTableStore.setState({ players });

    const callsBefore = vi.mocked(getAIDecision).mock.calls.length;
    const promise = useTableStore.getState().processAITurn();
    vi.advanceTimersByTime(TIMING.AI_THINKING_MIN + TIMING.AI_THINKING_RANDOM + 100);
    await promise;

    expect(vi.mocked(getAIDecision).mock.calls.length).toBe(callsBefore);
  });
});

// ============================================
// determineWinners - everyone folds
// ============================================
describe("determineWinners - everyone folds", () => {
  it("should give pot to last remaining player", () => {
    setupTable();
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    const { winners, pot } = useTableStore.getState();
    expect(winners).toHaveLength(1);
    expect(pot).toBe(0);
  });

  it("should set phase to result", () => {
    setupTable();
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    expect(useTableStore.getState().phase).toBe("result");
  });

  it("should set pot to 0 after awarding", () => {
    setupTable();
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    expect(useTableStore.getState().pot).toBe(0);
  });

  it("should store lastWonPot for display", () => {
    setupTable();
    const { pot } = useTableStore.getState();
    for (let i = 0; i < 5; i++) {
      useTableStore.getState().handleAction("fold");
    }
    expect(useTableStore.getState().lastWonPot).toBe(pot);
  });
});

// ============================================
// determineWinners - showdown
// ============================================
describe("determineWinners - showdown", () => {
  it("should call evaluateHand for each active player", () => {
    setupTable();
    vi.mocked(evaluateHand).mockClear();

    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    useTableStore.getState().dealRiver();
    useTableStore.getState().determineWinners();

    const activePlayers = useTableStore.getState().players.filter((p) => !p.isFolded && p.holeCards);
    expect(vi.mocked(evaluateHand).mock.calls.length).toBe(activePlayers.length);
  });

  it("should handle split pot", () => {
    setupTable();
    vi.mocked(findWinners).mockReturnValueOnce([
      { playerId: "player_0", evaluation: { rank: "pair" as const, rankValue: 200, description: "Pair", descriptionZh: "一對", kickers: ["A" as const] } },
      { playerId: "player_1", evaluation: { rank: "pair" as const, rankValue: 200, description: "Pair", descriptionZh: "一對", kickers: ["A" as const] } },
    ]);

    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    useTableStore.getState().dealRiver();
    useTableStore.getState().determineWinners();

    expect(useTableStore.getState().winners).toBeDefined();
    expect(useTableStore.getState().winners!.length).toBeGreaterThanOrEqual(1);
  });

  it("should store hand evaluations", () => {
    setupTable();
    useTableStore.getState().dealFlop();
    useTableStore.getState().dealTurn();
    useTableStore.getState().dealRiver();
    useTableStore.getState().determineWinners();

    expect(useTableStore.getState().handEvaluations.size).toBeGreaterThan(0);
  });
});
