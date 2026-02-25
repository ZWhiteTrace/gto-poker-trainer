import { describe, it, expect } from "vitest";
import { evaluateHand, compareHands, determineWinners } from "@/lib/poker/handEvaluator";
import type { Card } from "@/lib/poker/types";

// Helper to create cards
function card(rank: string, suit: string): Card {
  return { rank, suit } as Card;
}

describe("evaluateHand", () => {
  describe("hand ranking identification", () => {
    it("should identify royal flush", () => {
      const holeCards: [Card, Card] = [card("A", "h"), card("K", "h")];
      const community = [
        card("Q", "h"),
        card("J", "h"),
        card("T", "h"),
        card("2", "d"),
        card("3", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("royal_flush");
    });

    it("should identify straight flush", () => {
      const holeCards: [Card, Card] = [card("9", "h"), card("8", "h")];
      const community = [
        card("7", "h"),
        card("6", "h"),
        card("5", "h"),
        card("2", "d"),
        card("3", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("straight_flush");
    });

    it("should identify four of a kind", () => {
      const holeCards: [Card, Card] = [card("A", "h"), card("A", "s")];
      const community = [
        card("A", "d"),
        card("A", "c"),
        card("K", "h"),
        card("2", "d"),
        card("3", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("four_of_a_kind");
    });

    it("should identify full house", () => {
      const holeCards: [Card, Card] = [card("K", "h"), card("K", "s")];
      const community = [
        card("K", "d"),
        card("Q", "c"),
        card("Q", "h"),
        card("2", "d"),
        card("3", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("full_house");
    });

    it("should identify flush", () => {
      const holeCards: [Card, Card] = [card("A", "h"), card("K", "h")];
      const community = [
        card("9", "h"),
        card("7", "h"),
        card("2", "h"),
        card("3", "d"),
        card("4", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("flush");
    });

    it("should identify straight", () => {
      const holeCards: [Card, Card] = [card("9", "h"), card("8", "s")];
      const community = [
        card("7", "d"),
        card("6", "c"),
        card("5", "h"),
        card("2", "d"),
        card("K", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("straight");
    });

    it("should identify wheel (A-2-3-4-5)", () => {
      const holeCards: [Card, Card] = [card("A", "h"), card("2", "s")];
      const community = [
        card("3", "d"),
        card("4", "c"),
        card("5", "h"),
        card("K", "d"),
        card("Q", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("straight");
    });

    it("should identify three of a kind", () => {
      const holeCards: [Card, Card] = [card("K", "h"), card("K", "s")];
      const community = [
        card("K", "d"),
        card("7", "c"),
        card("2", "h"),
        card("3", "d"),
        card("9", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("three_of_a_kind");
    });

    it("should identify two pair", () => {
      const holeCards: [Card, Card] = [card("K", "h"), card("Q", "s")];
      const community = [
        card("K", "d"),
        card("Q", "c"),
        card("2", "h"),
        card("3", "d"),
        card("9", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("two_pair");
    });

    it("should identify one pair", () => {
      const holeCards: [Card, Card] = [card("A", "h"), card("K", "s")];
      const community = [
        card("A", "d"),
        card("7", "c"),
        card("2", "h"),
        card("3", "d"),
        card("9", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("pair");
    });

    it("should identify high card", () => {
      const holeCards: [Card, Card] = [card("A", "h"), card("K", "s")];
      const community = [
        card("Q", "d"),
        card("7", "c"),
        card("2", "h"),
        card("3", "d"),
        card("9", "c"),
      ];
      const result = evaluateHand(holeCards, community);
      expect(result.rank).toBe("high_card");
    });
  });

  describe("hand comparison", () => {
    it("should rank flush higher than straight", () => {
      const holeCards1: [Card, Card] = [card("A", "h"), card("K", "h")];
      const holeCards2: [Card, Card] = [card("9", "s"), card("8", "s")];
      const community = [
        card("9", "h"),
        card("7", "h"),
        card("2", "h"),
        card("6", "d"),
        card("5", "c"),
      ];

      const flush = evaluateHand(holeCards1, community);
      const straight = evaluateHand(holeCards2, community);

      expect(compareHands(flush, straight)).toBeGreaterThan(0);
    });

    it("should compare same rank by kickers", () => {
      const holeCards1: [Card, Card] = [card("A", "h"), card("K", "s")];
      const holeCards2: [Card, Card] = [card("A", "d"), card("Q", "c")];
      const community = [
        card("A", "c"),
        card("7", "h"),
        card("2", "d"),
        card("3", "s"),
        card("9", "h"),
      ];

      const hand1 = evaluateHand(holeCards1, community);
      const hand2 = evaluateHand(holeCards2, community);

      // Both have pair of Aces, but hand1 has K kicker vs Q kicker
      expect(compareHands(hand1, hand2)).toBeGreaterThan(0);
    });
  });
});

describe("determineWinners", () => {
  it("should find single winner", () => {
    const players = [
      { id: "p1", holeCards: [card("A", "h"), card("A", "s")] as [Card, Card] },
      { id: "p2", holeCards: [card("K", "h"), card("K", "s")] as [Card, Card] },
    ];
    const community = [
      card("2", "d"),
      card("3", "c"),
      card("7", "h"),
      card("9", "d"),
      card("J", "c"),
    ];

    const winners = determineWinners(players, community);

    expect(winners).toHaveLength(1);
    expect(winners[0].playerId).toBe("p1");
  });

  it("should handle split pot (tie)", () => {
    const players = [
      { id: "p1", holeCards: [card("A", "h"), card("2", "s")] as [Card, Card] },
      { id: "p2", holeCards: [card("A", "d"), card("3", "c")] as [Card, Card] },
    ];
    // Board plays - both have board straight
    const community = [
      card("T", "h"),
      card("J", "c"),
      card("Q", "d"),
      card("K", "s"),
      card("A", "c"),
    ];

    const winners = determineWinners(players, community);

    expect(winners).toHaveLength(2);
  });

  it("should handle multiple players", () => {
    const players = [
      { id: "p1", holeCards: [card("A", "h"), card("A", "s")] as [Card, Card] },
      { id: "p2", holeCards: [card("K", "h"), card("K", "s")] as [Card, Card] },
      { id: "p3", holeCards: [card("Q", "h"), card("Q", "s")] as [Card, Card] },
    ];
    const community = [
      card("2", "d"),
      card("3", "c"),
      card("7", "h"),
      card("9", "d"),
      card("J", "c"),
    ];

    const winners = determineWinners(players, community);

    expect(winners).toHaveLength(1);
    expect(winners[0].playerId).toBe("p1");
    expect(winners[0].evaluation.rank).toBe("pair");
  });
});
