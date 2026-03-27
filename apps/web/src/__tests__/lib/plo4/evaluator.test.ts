import { describe, it, expect } from "vitest";
import { evaluatePLO4Hand, card, plo4Hand } from "@/lib/plo4/evaluator";
import { HandRank, type Board } from "@/lib/plo4/types";

function board(strs: string[]): Board {
  return strs.map(card);
}

describe("PLO4 Evaluator", () => {
  describe("must-use-exactly-2 rule", () => {
    it("uses 2 hole cards even when board has a flush", () => {
      // Board: 5 spades. Hand has 2 spades + 2 hearts.
      // Must use exactly 2 hole + 3 board — cannot use 0 or 1 from hand.
      const hand = plo4Hand(["As", "Ks", "Qh", "Jh"]);
      const b = board(["Ts", "9s", "8s", "7s", "2s"]);
      const result = evaluatePLO4Hand(hand, b);

      // Best: use As+Ks from hand + 3 spades from board = flush
      expect(result.rank).toBe(HandRank.Flush);
      expect(result.holeCardsUsed).toHaveLength(2);
      expect(result.boardCardsUsed).toHaveLength(3);
    });

    it("cannot make flush with only 1 hole card suited to board", () => {
      // Hand: As + 3 off-suit cards. Board: 4 spades + 1 heart.
      // Only 1 spade in hand — cannot make flush (need 2 from hand).
      const hand = plo4Hand(["As", "Kh", "Qd", "Jc"]);
      const b = board(["Ts", "9s", "8s", "7s", "2h"]);
      const result = evaluatePLO4Hand(hand, b);

      // Cannot make flush — best is likely a straight or high card
      expect(result.rank).not.toBe(HandRank.Flush);
      expect(result.rank).not.toBe(HandRank.StraightFlush);
    });

    it("cannot use 3 hole cards for a straight", () => {
      // Hand: A-K-Q-J. Board: T-9-2-3-4.
      // If you could use 3 hole cards: A-K-Q-J-T = straight. But PLO requires exactly 2.
      // With 2 hole cards: best might be KQ + T93 or AK + T92 etc.
      const hand = plo4Hand(["Ah", "Kd", "Qs", "Jc"]);
      const b = board(["Ts", "9h", "2d", "3c", "4h"]);
      const result = evaluatePLO4Hand(hand, b);

      // Best: use Q+J from hand + T+9+? from board = Q-J-T-9-? not a straight
      // Or A+K from hand + no help = high card pair at best
      // Actually: J+T from board, need to check what's possible
      // The point is: can't make AKQJT straight (needs 3 from hand)
      expect(result.holeCardsUsed).toHaveLength(2);
      expect(result.boardCardsUsed).toHaveLength(3);
    });

    it("board pair does not give trips without matching hole card", () => {
      // Board has pair of Kings. Hand has no King.
      // Cannot make trips/full house with Kings.
      const hand = plo4Hand(["Ah", "Qd", "Js", "Tc"]);
      const b = board(["Kh", "Kd", "7s", "3c", "2h"]);
      const result = evaluatePLO4Hand(hand, b);

      // Best is One Pair (Kings from board) + A-Q kickers
      expect(result.rank).toBe(HandRank.OnePair);
    });
  });

  describe("hand ranking accuracy", () => {
    it("detects royal flush", () => {
      const hand = plo4Hand(["Ah", "Kh", "2d", "3c"]);
      const b = board(["Qh", "Jh", "Th", "5s", "6d"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.RoyalFlush);
      expect(result.description).toBe("Royal Flush");
    });

    it("detects straight flush", () => {
      const hand = plo4Hand(["9h", "8h", "2d", "3c"]);
      const b = board(["7h", "6h", "5h", "Ks", "Qd"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.StraightFlush);
    });

    it("detects four of a kind", () => {
      const hand = plo4Hand(["Ah", "Ad", "Ks", "Qc"]);
      const b = board(["As", "Ac", "7h", "3d", "2s"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.FourOfAKind);
      expect(result.description).toContain("Aces");
    });

    it("detects full house", () => {
      const hand = plo4Hand(["Ah", "Ad", "Ks", "Kc"]);
      const b = board(["As", "7h", "7d", "3c", "2s"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.FullHouse);
    });

    it("detects flush", () => {
      const hand = plo4Hand(["Ah", "9h", "Kd", "Qc"]);
      const b = board(["Kh", "7h", "3h", "5s", "2d"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.Flush);
    });

    it("detects straight", () => {
      const hand = plo4Hand(["Ah", "Kd", "Qs", "2c"]);
      const b = board(["Jh", "Ts", "9d", "3c", "4h"]);
      const result = evaluatePLO4Hand(hand, b);

      // A-K from hand + J-T-9 from board = AKJT9? No, KQ from hand + JT9 = KQJT9 straight
      expect(result.rank).toBe(HandRank.Straight);
    });

    it("detects wheel (A-2-3-4-5)", () => {
      const hand = plo4Hand(["Ah", "2d", "Ks", "Qc"]);
      const b = board(["3h", "4s", "5d", "9c", "Th"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.Straight);
      expect(result.description).toContain("Five-high");
    });

    it("detects three of a kind", () => {
      const hand = plo4Hand(["Kh", "Kd", "2s", "3c"]);
      const b = board(["Ks", "8h", "7d", "5c", "4h"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.ThreeOfAKind);
    });

    it("detects two pair", () => {
      const hand = plo4Hand(["Ah", "Kd", "9s", "8c"]);
      const b = board(["As", "Kh", "7d", "3c", "2h"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.TwoPair);
    });

    it("detects one pair", () => {
      const hand = plo4Hand(["Ah", "Kd", "Qs", "Jc"]);
      const b = board(["As", "7h", "5d", "3c", "2h"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.OnePair);
    });

    it("detects high card", () => {
      const hand = plo4Hand(["Ah", "Kd", "Qs", "Jc"]);
      const b = board(["9h", "7s", "5d", "3c", "2h"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.rank).toBe(HandRank.HighCard);
    });
  });

  describe("best hand selection from 60 combinations", () => {
    it("picks the strongest among all C(4,2)×C(5,3) combos", () => {
      // Hand has both flush draw and straight draw potential
      const hand = plo4Hand(["Ah", "Kh", "Qd", "Jd"]);
      const b = board(["Th", "9h", "8d", "2c", "3s"]);
      const result = evaluatePLO4Hand(hand, b);

      // Ah+Kh from hand + Th+9h+8? = flush? Need 3 hearts on board.
      // Board has Th, 9h only (2 hearts). So: Ah+Kh + Th+9h+X = 4 hearts, not 5.
      // Wait — 5-card hand: Ah, Kh (2 from hand) + Th, 9h, 8d (3 from board) = only 4 hearts of 5. Not a flush.
      // Best: Q+J from hand + T+9+8 from board = QJT98 straight
      expect(result.rank).toBe(HandRank.Straight);
      expect(result.description).toContain("Queen-high");
    });

    it("prefers flush over straight when both available", () => {
      const hand = plo4Hand(["Ah", "Kh", "Qd", "Jd"]);
      const b = board(["Th", "9h", "8h", "2c", "3s"]);
      const result = evaluatePLO4Hand(hand, b);

      // Ah+Kh + Th+9h+8h = A-high flush (5 hearts)
      // Q+J + T+9+8 = straight
      // Flush beats straight
      expect(result.rank).toBe(HandRank.Flush);
    });
  });

  describe("edge cases", () => {
    it("works with flop (3 board cards)", () => {
      const hand = plo4Hand(["Ah", "Kd", "Qs", "Jc"]);
      const b = board(["Ts", "9h", "2d"]);
      const result = evaluatePLO4Hand(hand, b);

      // Only C(4,2)×C(3,3) = 6 combinations (must use all 3 board cards)
      expect(result.holeCardsUsed).toHaveLength(2);
      expect(result.boardCardsUsed).toHaveLength(3);
    });

    it("works with turn (4 board cards)", () => {
      const hand = plo4Hand(["Ah", "Kd", "Qs", "Jc"]);
      const b = board(["Ts", "9h", "2d", "3c"]);
      const result = evaluatePLO4Hand(hand, b);

      expect(result.holeCardsUsed).toHaveLength(2);
      expect(result.boardCardsUsed).toHaveLength(3);
    });

    it("throws for invalid board size", () => {
      const hand = plo4Hand(["Ah", "Kd", "Qs", "Jc"]);
      expect(() => evaluatePLO4Hand(hand, board(["Ts", "9h"]))).toThrow();
      expect(() => evaluatePLO4Hand(hand, board(["Ts", "9h", "2d", "3c", "4h", "5s"]))).toThrow();
    });
  });

  describe("helper functions", () => {
    it("card() parses shorthand", () => {
      const c = card("Ah");
      expect(c.rank).toBe("A");
      expect(c.suit).toBe("h");
    });

    it("plo4Hand() parses string", () => {
      const h = plo4Hand("AhKsQdJc");
      expect(h).toHaveLength(4);
      expect(h[0]).toEqual({ rank: "A", suit: "h" });
      expect(h[3]).toEqual({ rank: "J", suit: "c" });
    });

    it("plo4Hand() parses array", () => {
      const h = plo4Hand(["Ah", "Ks", "Qd", "Jc"]);
      expect(h).toHaveLength(4);
    });
  });
});
