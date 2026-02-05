import { describe, it, expect } from "vitest";
import { analyzeBoardTexture } from "@/lib/poker/boardTexture";
import type { Card } from "@/lib/poker/types";

// Helper to create cards quickly
function card(rank: string, suit: string): Card {
  return { rank, suit } as Card;
}

describe("analyzeBoardTexture", () => {
  describe("empty board", () => {
    it("should return default analysis for empty board", () => {
      const result = analyzeBoardTexture([]);

      expect(result.texture).toBe("dry");
      expect(result.isMonotone).toBe(false);
      expect(result.isPaired).toBe(false);
      expect(result.isDry).toBe(true);
      expect(result.isWet).toBe(false);
    });
  });

  describe("monotone boards", () => {
    it("should detect monotone flop (3 same suit)", () => {
      const board = [card("A", "h"), card("K", "h"), card("5", "h")];
      const result = analyzeBoardTexture(board);

      expect(result.texture).toBe("monotone");
      expect(result.isMonotone).toBe(true);
      expect(result.hasFlushDraw).toBe(true);
    });

    it("should detect monotone with 4 cards same suit", () => {
      const board = [card("A", "s"), card("K", "s"), card("5", "s"), card("2", "s")];
      const result = analyzeBoardTexture(board);

      expect(result.isMonotone).toBe(true);
    });
  });

  describe("paired boards", () => {
    it("should detect paired flop", () => {
      const board = [card("K", "h"), card("K", "s"), card("5", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.texture).toBe("paired");
      expect(result.isPaired).toBe(true);
    });

    it("should detect trips on board", () => {
      const board = [card("7", "h"), card("7", "s"), card("7", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.isPaired).toBe(true);
    });
  });

  describe("flush draw detection", () => {
    it("should detect flush draw (2 same suit)", () => {
      const board = [card("A", "h"), card("K", "h"), card("5", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.hasFlushDraw).toBe(true);
    });

    it("should not detect flush draw with rainbow board", () => {
      const board = [card("A", "h"), card("K", "s"), card("5", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.hasFlushDraw).toBe(false);
    });
  });

  describe("straight draw / connectedness detection", () => {
    it("should detect connected board (consecutive ranks)", () => {
      const board = [card("9", "h"), card("8", "s"), card("7", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.hasStraightDraw).toBe(true);
      expect(result.connectedness).toBeGreaterThan(0.5);
    });

    it("should detect one-gapper as connected", () => {
      const board = [card("T", "h"), card("8", "s"), card("6", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.hasStraightDraw).toBe(true);
    });

    it("should detect wheel possibility (A-low)", () => {
      const board = [card("A", "h"), card("3", "s"), card("2", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.hasStraightDraw).toBe(true);
      expect(result.connectedness).toBeGreaterThan(0);
    });
  });

  describe("dry boards", () => {
    it("should detect dry rainbow unconnected board", () => {
      const board = [card("K", "h"), card("7", "s"), card("2", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.texture).toBe("dry");
      expect(result.isDry).toBe(true);
      expect(result.isWet).toBe(false);
    });

    it("should detect A-high dry board", () => {
      // A-9-6 rainbow - no wheel potential (no card ≤5), truly dry
      const board = [card("A", "h"), card("9", "s"), card("6", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.isDry).toBe(true);
      expect(result.highCard).toBe("A");
    });

    it("should detect wheel potential with A-low cards", () => {
      // A-8-3 has wheel potential (A-2-3-4-5)
      const board = [card("A", "h"), card("8", "s"), card("3", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.hasStraightDraw).toBe(true);
      expect(result.highCard).toBe("A");
    });
  });

  describe("wet boards", () => {
    it("should detect wet board with flush draw and connected", () => {
      const board = [card("J", "h"), card("T", "h"), card("9", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.isWet).toBe(true);
      expect(result.hasFlushDraw).toBe(true);
      expect(result.hasStraightDraw).toBe(true);
    });
  });

  describe("high card detection", () => {
    it("should detect high card correctly", () => {
      const board = [card("Q", "h"), card("J", "s"), card("5", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.highCard).toBe("Q");
    });

    it("should detect Ace as high card", () => {
      const board = [card("A", "h"), card("K", "s"), card("Q", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.highCard).toBe("A");
    });
  });

  describe("real game scenarios", () => {
    it("should analyze AKQ rainbow correctly", () => {
      const board = [card("A", "h"), card("K", "s"), card("Q", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.highCard).toBe("A");
      expect(result.hasStraightDraw).toBe(true);
      expect(result.hasFlushDraw).toBe(false);
      expect(result.texture).toBe("connected");
    });

    it("should analyze T72 rainbow (dry) correctly", () => {
      const board = [card("T", "h"), card("7", "s"), card("2", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.isDry).toBe(true);
      expect(result.isPaired).toBe(false);
      expect(result.isMonotone).toBe(false);
    });

    it("should analyze 987 two-tone (very wet) correctly", () => {
      const board = [card("9", "h"), card("8", "h"), card("7", "d")];
      const result = analyzeBoardTexture(board);

      expect(result.isWet).toBe(true);
      expect(result.hasStraightDraw).toBe(true);
      expect(result.hasFlushDraw).toBe(true);
    });
  });
});
