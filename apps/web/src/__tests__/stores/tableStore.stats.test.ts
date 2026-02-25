/**
 * tableStore stats tests: Hero/position/session/AI statistics
 */
import { useTableStore } from "@/stores/tableStore";
import { setupTable, getHeroIndex } from "./tableStore.helpers";
import { TIMING } from "@/lib/poker/constants";

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

/** Complete hand by folding N players */
function completeHandByFolding(numFolds = 5) {
  for (let i = 0; i < numFolds; i++) {
    useTableStore.getState().handleAction("fold");
  }
}

// ============================================
// Hero stats - preflop
// ============================================
describe("hero stats - preflop", () => {
  it("should track VPIP on call", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({ activePlayerIndex: heroIdx });

    const before = useTableStore.getState().heroStats.handsVPIP;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().heroStats.handsVPIP).toBe(before + 1);
  });

  it("should track VPIP on raise", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({ activePlayerIndex: heroIdx });

    const before = useTableStore.getState().heroStats.handsVPIP;
    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().heroStats.handsVPIP).toBe(before + 1);
  });

  it("should track VPIP on allin", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({ activePlayerIndex: heroIdx });

    const before = useTableStore.getState().heroStats.handsVPIP;
    useTableStore.getState().handleAction("allin");
    expect(useTableStore.getState().heroStats.handsVPIP).toBe(before + 1);
  });

  it("should NOT double-count VPIP on same hand", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({ activePlayerIndex: heroIdx });

    useTableStore.getState().handleAction("call");
    const vpipAfterFirst = useTableStore.getState().heroStats.handsVPIP;

    // Simulate hero acting again
    useTableStore.setState({ activePlayerIndex: heroIdx });
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().heroStats.handsVPIP).toBe(vpipAfterFirst);
  });

  it("should track PFR on raise", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({ activePlayerIndex: heroIdx });

    const before = useTableStore.getState().heroStats.handsPFR;
    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().heroStats.handsPFR).toBe(before + 1);
  });

  it("should NOT track PFR on call", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({ activePlayerIndex: heroIdx });

    const before = useTableStore.getState().heroStats.handsPFR;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().heroStats.handsPFR).toBe(before);
  });

  it("should track ATS from steal position when folded to hero", () => {
    setupTable();
    const heroIdx = getHeroIndex();

    const players = [...useTableStore.getState().players];
    players[heroIdx] = { ...players[heroIdx], position: "CO" };
    useTableStore.setState({ players, activePlayerIndex: heroIdx, actionHistory: [] });

    const stealBefore = useTableStore.getState().heroStats.stealOpportunities;
    const attemptsBefore = useTableStore.getState().heroStats.stealAttempts;

    useTableStore.getState().handleAction("raise", 3);
    expect(useTableStore.getState().heroStats.stealOpportunities).toBe(stealBefore + 1);
    expect(useTableStore.getState().heroStats.stealAttempts).toBe(attemptsBefore + 1);
  });

  it("should track 3-bet when exactly 1 previous raise", () => {
    setupTable();
    const heroIdx = getHeroIndex();

    useTableStore.setState({
      actionHistory: [{
        playerId: "player_0", playerName: "AI", position: "UTG" as const,
        action: "raise" as const, amount: 3, street: "preflop" as const,
        timestamp: Date.now(), isHero: false,
      }],
      activePlayerIndex: heroIdx,
    });

    const before3Bet = useTableStore.getState().heroStats.threeBetCount;
    const beforeOpp = useTableStore.getState().heroStats.threeBetOpportunity;

    useTableStore.getState().handleAction("raise", 9);
    expect(useTableStore.getState().heroStats.threeBetOpportunity).toBe(beforeOpp + 1);
    expect(useTableStore.getState().heroStats.threeBetCount).toBe(before3Bet + 1);
  });

  it("should track fold to 3-bet", () => {
    setupTable();
    const heroIdx = getHeroIndex();

    useTableStore.setState({
      actionHistory: [
        {
          playerId: `player_${heroIdx}`, playerName: "Hero", position: "BTN" as const,
          action: "raise" as const, amount: 3, street: "preflop" as const,
          timestamp: Date.now(), isHero: true,
        },
        {
          playerId: "player_0", playerName: "AI", position: "BB" as const,
          action: "raise" as const, amount: 9, street: "preflop" as const,
          timestamp: Date.now(), isHero: false,
        },
      ],
      activePlayerIndex: heroIdx,
      currentBet: 9,
    });

    const foldBefore = useTableStore.getState().heroStats.foldTo3BetCount;
    const facedBefore = useTableStore.getState().heroStats.faced3BetCount;

    useTableStore.getState().handleAction("fold");
    expect(useTableStore.getState().heroStats.faced3BetCount).toBe(facedBefore + 1);
    expect(useTableStore.getState().heroStats.foldTo3BetCount).toBe(foldBefore + 1);
  });
});

// ============================================
// Hero stats - postflop
// ============================================
describe("hero stats - postflop", () => {
  it("should track flop C-bet when hero was preflop aggressor", () => {
    setupTable();
    const heroIdx = getHeroIndex();

    useTableStore.setState({
      actionHistory: [{
        playerId: `player_${heroIdx}`, playerName: "Hero", position: "BTN" as const,
        action: "raise" as const, amount: 3, street: "preflop" as const,
        timestamp: Date.now(), isHero: true,
      }],
      activePlayerIndex: heroIdx,
      currentStreet: "flop",
      currentBet: 0,
    });

    const cbetBefore = useTableStore.getState().heroStats.flopCBet;
    const cbetOppBefore = useTableStore.getState().heroStats.flopCBetOpportunity;

    useTableStore.getState().handleAction("bet", 2);
    expect(useTableStore.getState().heroStats.flopCBetOpportunity).toBe(cbetOppBefore + 1);
    expect(useTableStore.getState().heroStats.flopCBet).toBe(cbetBefore + 1);
  });

  it("should track facing C-bet from villain preflop aggressor", () => {
    setupTable();
    const heroIdx = getHeroIndex();

    useTableStore.setState({
      actionHistory: [
        {
          playerId: "player_0", playerName: "AI", position: "UTG" as const,
          action: "raise" as const, amount: 3, street: "preflop" as const,
          timestamp: Date.now(), isHero: false,
        },
        {
          playerId: "player_0", playerName: "AI", position: "UTG" as const,
          action: "bet" as const, amount: 2, street: "flop" as const,
          timestamp: Date.now(), isHero: false,
        },
      ],
      activePlayerIndex: heroIdx,
      currentStreet: "flop",
      currentBet: 2,
    });

    const before = useTableStore.getState().heroStats.facedCBet;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().heroStats.facedCBet).toBe(before + 1);
    expect(useTableStore.getState().heroStats.callCBet).toBeGreaterThan(0);
  });

  it("should track check-raise", () => {
    setupTable();
    const heroIdx = getHeroIndex();

    useTableStore.setState({
      actionHistory: [
        {
          playerId: `player_${heroIdx}`, playerName: "Hero", position: "BB" as const,
          action: "check" as const, street: "flop" as const,
          timestamp: Date.now(), isHero: true,
        },
        {
          playerId: "player_0", playerName: "AI", position: "UTG" as const,
          action: "bet" as const, amount: 2, street: "flop" as const,
          timestamp: Date.now(), isHero: false,
        },
      ],
      activePlayerIndex: heroIdx,
      currentStreet: "flop",
      currentBet: 2,
    });

    const crBefore = useTableStore.getState().heroStats.checkRaiseCount;
    const crOppBefore = useTableStore.getState().heroStats.checkRaiseOpportunity;

    useTableStore.getState().handleAction("raise", 6);
    expect(useTableStore.getState().heroStats.checkRaiseOpportunity).toBe(crOppBefore + 1);
    expect(useTableStore.getState().heroStats.checkRaiseCount).toBe(crBefore + 1);
  });

  it("should track totalBets on bet action", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({
      activePlayerIndex: heroIdx, currentStreet: "flop",
      currentBet: 0, actionHistory: [],
    });

    const before = useTableStore.getState().heroStats.totalBets;
    useTableStore.getState().handleAction("bet", 2);
    expect(useTableStore.getState().heroStats.totalBets).toBe(before + 1);
  });

  it("should track totalRaises on raise action", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({
      activePlayerIndex: heroIdx, currentStreet: "flop",
      currentBet: 2, actionHistory: [],
    });

    const before = useTableStore.getState().heroStats.totalRaises;
    useTableStore.getState().handleAction("raise", 6);
    expect(useTableStore.getState().heroStats.totalRaises).toBe(before + 1);
  });

  it("should track totalCalls on call action", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    useTableStore.setState({
      activePlayerIndex: heroIdx, currentStreet: "flop",
      currentBet: 2, actionHistory: [],
    });

    const before = useTableStore.getState().heroStats.totalCalls;
    useTableStore.getState().handleAction("call");
    expect(useTableStore.getState().heroStats.totalCalls).toBe(before + 1);
  });
});

// ============================================
// Position stats
// ============================================
describe("position stats", () => {
  it("should track handsPlayed per position", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    const heroPosition = useTableStore.getState().players[heroIdx].position;
    const before = useTableStore.getState().positionStats[heroPosition].handsPlayed;

    completeHandByFolding();
    expect(useTableStore.getState().positionStats[heroPosition].handsPlayed).toBe(before + 1);
  });

  it("should track totalProfit per position", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    const heroPosition = useTableStore.getState().players[heroIdx].position;

    completeHandByFolding();
    expect(typeof useTableStore.getState().positionStats[heroPosition].totalProfit).toBe("number");
  });

  it("should track handsWon per position when hero wins", () => {
    setupTable();
    const heroIdx = getHeroIndex();
    const heroPosition = useTableStore.getState().players[heroIdx].position;

    // Make hero the last remaining by not folding hero
    const { activePlayerIndex } = useTableStore.getState();
    if (useTableStore.getState().players[activePlayerIndex].isHero) {
      useTableStore.getState().handleAction("call");
    }

    let safety = 0;
    while (useTableStore.getState().phase === "playing" && safety < 10) {
      const s = useTableStore.getState();
      const player = s.players[s.activePlayerIndex];
      if (!player.isHero) {
        s.handleAction("fold");
      } else {
        s.handleAction("check");
      }
      vi.advanceTimersByTime(TIMING.STREET_TRANSITION + 100);
      safety++;
    }

    if (useTableStore.getState().winners?.[0]?.isHero) {
      expect(useTableStore.getState().positionStats[heroPosition].handsWon).toBeGreaterThan(0);
    }
  });
});

// ============================================
// Session stats
// ============================================
describe("session stats", () => {
  it("should increment handsPlayed", () => {
    setupTable();
    completeHandByFolding();
    expect(useTableStore.getState().sessionStats.handsPlayed).toBe(1);
  });

  it("should accumulate across multiple hands", () => {
    setupTable();
    completeHandByFolding();
    useTableStore.getState().startNewHand();
    completeHandByFolding();
    expect(useTableStore.getState().sessionStats.handsPlayed).toBe(2);
  });

  it("should track biggestPot", () => {
    setupTable();
    const potBefore = useTableStore.getState().pot;
    completeHandByFolding();
    expect(useTableStore.getState().sessionStats.biggestPot).toBeGreaterThanOrEqual(potBefore);
  });

  it("should reset on resetSession", () => {
    setupTable();
    completeHandByFolding();
    useTableStore.getState().resetSession();
    const { sessionStats } = useTableStore.getState();
    expect(sessionStats.handsPlayed).toBe(0);
    expect(sessionStats.handsWon).toBe(0);
    expect(sessionStats.totalProfit).toBe(0);
    expect(sessionStats.biggestPot).toBe(0);
  });

  it("should track totalProfit", () => {
    setupTable();
    completeHandByFolding();
    expect(typeof useTableStore.getState().sessionStats.totalProfit).toBe("number");
  });
});

// ============================================
// Hero handsPlayed tracking
// ============================================
describe("hero stats - handsPlayed", () => {
  it("should increment handsPlayed on hand completion", () => {
    setupTable();
    const before = useTableStore.getState().heroStats.handsPlayed;
    completeHandByFolding();
    expect(useTableStore.getState().heroStats.handsPlayed).toBe(before + 1);
  });

  it("should reset on resetSession", () => {
    setupTable();
    completeHandByFolding();
    useTableStore.getState().resetSession();
    expect(useTableStore.getState().heroStats.handsPlayed).toBe(0);
  });
});

// ============================================
// AI opponent stats
// ============================================
describe("AI opponent stats", () => {
  it("should track byStyle on hand completion", () => {
    setupTable();
    completeHandByFolding();
    const total = Object.values(useTableStore.getState().aiOpponentStats.byStyle).reduce(
      (sum, s) => sum + s.handsPlayed, 0
    );
    expect(total).toBeGreaterThan(0);
  });

  it("should track byPlayer on hand completion", () => {
    setupTable();
    completeHandByFolding();
    expect(Object.keys(useTableStore.getState().aiOpponentStats.byPlayer).length).toBeGreaterThan(0);
  });

  it("should accumulate stats across hands", () => {
    setupTable();
    completeHandByFolding();
    const firstTotal = Object.values(useTableStore.getState().aiOpponentStats.byStyle).reduce(
      (sum, s) => sum + s.handsPlayed, 0
    );

    useTableStore.getState().startNewHand();
    completeHandByFolding();
    const secondTotal = Object.values(useTableStore.getState().aiOpponentStats.byStyle).reduce(
      (sum, s) => sum + s.handsPlayed, 0
    );
    expect(secondTotal).toBeGreaterThan(firstTotal);
  });

  it("should reset on resetSession", () => {
    setupTable();
    completeHandByFolding();
    useTableStore.getState().resetSession();
    const total = Object.values(useTableStore.getState().aiOpponentStats.byStyle).reduce(
      (sum, s) => sum + s.handsPlayed, 0
    );
    expect(total).toBe(0);
  });
});
