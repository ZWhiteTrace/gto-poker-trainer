import { describe, it, expect } from "vitest";
import { generateBestHandQuestion, type PLO4QuizQuestion } from "@/lib/plo4/quizGenerator";
import { HandRank } from "@/lib/plo4/types";

function assertValidQuestion(q: PLO4QuizQuestion) {
  expect(q.id).toMatch(/^bh-/);
  expect(q.type).toBe("best-hand");
  expect(["easy", "medium", "hard"]).toContain(q.difficulty);
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.promptZh.length).toBeGreaterThan(0);
  expect(q.options).toHaveLength(4);
  expect(q.options.find((o) => o.id === q.correctOptionId)).toBeDefined();
  expect(q.explanation.length).toBeGreaterThan(0);
  expect(q.explanationZh.length).toBeGreaterThan(0);
  expect(q.tags.length).toBeGreaterThanOrEqual(1);
}

describe("PLO4 Quiz Generator — best-hand", () => {
  describe("question structure", () => {
    it("generates a valid question with all required fields", () => {
      const q = generateBestHandQuestion(42);
      assertValidQuestion(q);
    });

    it("has exactly 4 options (1 correct + 3 distractors)", () => {
      const q = generateBestHandQuestion(42);
      expect(q.options).toHaveLength(4);

      const correctOption = q.options.find((o) => o.id === q.correctOptionId);
      expect(correctOption).toBeDefined();
    });

    it("correct answer matches evaluator result", () => {
      const q = generateBestHandQuestion(42);
      const { correctResult } = q.scenario;

      expect(correctResult.holeCardsUsed).toHaveLength(2);
      expect(correctResult.boardCardsUsed).toHaveLength(3);
      expect(correctResult.bestFive).toHaveLength(5);
      expect(Object.values(HandRank)).toContain(correctResult.rank);
    });

    it("option IDs are unique", () => {
      const q = generateBestHandQuestion(42);
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("scenario validity", () => {
    it("no duplicate cards in 9-card deal", () => {
      const q = generateBestHandQuestion(42);
      const allCards = [...q.scenario.holeCards, ...q.scenario.board];
      const strs = allCards.map((c) => `${c.rank}${c.suit}`);
      expect(new Set(strs).size).toBe(9);
    });

    it("hole cards have exactly 4 cards", () => {
      const q = generateBestHandQuestion(42);
      expect(q.scenario.holeCards).toHaveLength(4);
    });

    it("board has exactly 5 cards", () => {
      const q = generateBestHandQuestion(42);
      expect(q.scenario.board).toHaveLength(5);
    });
  });

  describe("explanation quality", () => {
    it("explanation mentions which hole cards were used", () => {
      const q = generateBestHandQuestion(42);
      const { holeCardsUsed } = q.scenario.correctResult;
      for (const c of holeCardsUsed) {
        expect(q.explanation).toContain(`${c.rank}${c.suit}`);
      }
    });

    it("explanation mentions which board cards were used", () => {
      const q = generateBestHandQuestion(42);
      const { boardCardsUsed } = q.scenario.correctResult;
      for (const c of boardCardsUsed) {
        expect(q.explanation).toContain(`${c.rank}${c.suit}`);
      }
    });
  });

  describe("deterministic with seed", () => {
    it("same seed produces same question", () => {
      const q1 = generateBestHandQuestion(123);
      const q2 = generateBestHandQuestion(123);
      expect(q1.id).toBe(q2.id);
      expect(q1.correctOptionId).toBe(q2.correctOptionId);
      expect(q1.scenario.correctResult.rank).toBe(q2.scenario.correctResult.rank);
    });

    it("different seeds produce different questions", () => {
      const q1 = generateBestHandQuestion(1);
      const q2 = generateBestHandQuestion(2);
      expect(q1.id).not.toBe(q2.id);
    });
  });

  describe("distractor quality", () => {
    it("distractors are different from correct answer", () => {
      const q = generateBestHandQuestion(42);
      const correctText = q.options.find((o) => o.id === q.correctOptionId)?.text;
      const distractors = q.options.filter((o) => o.id !== q.correctOptionId);
      for (const d of distractors) {
        expect(d.text).not.toBe(correctText);
      }
    });

    it("all distractor texts are unique", () => {
      const q = generateBestHandQuestion(42);
      const texts = q.options.map((o) => o.text);
      expect(new Set(texts).size).toBe(texts.length);
    });
  });

  describe("generates many valid questions without crash", () => {
    it("100 random seeds all produce valid questions", () => {
      for (let seed = 0; seed < 100; seed++) {
        const q = generateBestHandQuestion(seed);
        assertValidQuestion(q);

        const allCards = [...q.scenario.holeCards, ...q.scenario.board];
        const strs = allCards.map((c) => `${c.rank}${c.suit}`);
        expect(new Set(strs).size).toBe(9);
      }
    });
  });
});
